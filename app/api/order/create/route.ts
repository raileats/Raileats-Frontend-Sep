export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";

function detectBookingSource(req: Request, clientSource?: unknown) {
  const explicit = String(clientSource || "").trim();
  const allowed = ["Desktop", "Mac", "Mobile Web", "IOS", "App"];

  if (allowed.includes(explicit)) return explicit;

  const ua = req.headers.get("user-agent") || "";
  const appHeader =
    req.headers.get("x-raileats-app") ||
    req.headers.get("x-requested-with") ||
    "";

  const isAndroid = /Android/i.test(ua);
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua);
  const isWindows = /Windows/i.test(ua);
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);
  const isAndroidApp =
    /raileats/i.test(appHeader) ||
    /RailEatsApp|RailEats-Android/i.test(ua) ||
    (isAndroid && (/; wv/i.test(ua) || /Version\/4\.0/i.test(ua)));

  if (isAndroidApp) return "App";
  if (isAndroid) return "Mobile Web";
  if (isIos) return "IOS";
  if (isMac && !isMobile) return "Mac";
  if (isWindows) return "Desktop";

  return isMobile ? "Mobile Web" : "Desktop";
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeCouponCode(value: unknown) {
  const code = String(value || "").trim().toUpperCase();
  return code || null;
}

function normalizeCouponDiscount(value: unknown) {
  const amount = toNumber(value, 0);
  return amount > 0 ? amount : 0;
}

function normalizeMobile(value: unknown) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function normalizeCode(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function isCouponActive(coupon: Record<string, any>) {
  const value = coupon?.IsActive;
  return value === true || value === 1 || String(value).toLowerCase() === "true";
}

function isCouponVisible(coupon: Record<string, any>) {
  const value = coupon?.ShowToCustomer;
  return value === true || value === 1 || String(value).toLowerCase() === "true";
}

function calculateCouponDiscount(coupon: Record<string, any>, subtotal: number) {
  const type = normalizeCode(coupon.CouponType || "FLAT");
  const value = toNumber(coupon.DiscountValue, 0);
  const maxDiscount = toNumber(coupon.MaximumDiscountAmount, 0);
  let discount = type === "PERCENT" ? (subtotal * value) / 100 : value;

  if (maxDiscount > 0) discount = Math.min(discount, maxDiscount);
  discount = Math.min(discount, subtotal);

  return Math.max(0, Math.round(discount * 100) / 100);
}

function isCouponInValidity(coupon: Record<string, any>, now: Date) {
  const validFrom = coupon.ValidFrom ? new Date(coupon.ValidFrom) : null;
  const validTill = coupon.ValidTill ? new Date(coupon.ValidTill) : null;

  if (validFrom && !Number.isNaN(validFrom.getTime()) && validFrom > now) {
    return false;
  }

  if (validTill && !Number.isNaN(validTill.getTime()) && validTill < now) {
    return false;
  }

  return true;
}

function usageCreatedAtColumn(row: Record<string, any>) {
  return (
    row.CreatedAt ||
    row.created_at ||
    row.UsedAt ||
    row.used_at ||
    row.createdAt ||
    ""
  );
}

function isUsageInFrequencyWindow(createdAt: string, frequency: string) {
  if (!createdAt) return true;
  if (frequency === "UNLIMITED" || !frequency) return true;

  const usedAt = new Date(createdAt);
  if (Number.isNaN(usedAt.getTime())) return true;

  const now = new Date();
  const diffMs = now.getTime() - usedAt.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  if (frequency === "DAILY") return diffMs < dayMs;
  if (frequency === "WEEKLY") return diffMs < 7 * dayMs;
  if (frequency === "MONTHLY") return diffMs < 31 * dayMs;
  if (frequency === "ONCE") return true;

  return true;
}

async function getCouponUsageCount(
  couponId: unknown,
  customerMobile: string,
  frequency: string
) {
  if (!couponId || !customerMobile) return 0;

  const { data, error } = await serviceClient
    .from("CouponUsage")
    .select("*")
    .eq("CouponId", couponId)
    .eq("CustomerMobile", customerMobile);

  if (error || !Array.isArray(data)) return 0;

  return data.filter((row) =>
    isUsageInFrequencyWindow(usageCreatedAtColumn(row), frequency)
  ).length;
}

async function validateCouponForOrder({
  couponCode,
  subtotal,
  quantity,
  restroCode,
  customerMobile,
}: {
  couponCode: string;
  subtotal: number;
  quantity: number;
  restroCode: string;
  customerMobile: string;
}) {
  const code = normalizeCode(couponCode);

  const { data: coupon, error } = await serviceClient
    .from("Coupons")
    .select("*")
    .ilike("CouponCode", code)
    .maybeSingle();

  if (error || !coupon) {
    return { ok: false, message: "Invalid coupon code." };
  }

  if (!isCouponActive(coupon) || !isCouponVisible(coupon)) {
    return { ok: false, message: "Coupon is not active." };
  }

  if (!isCouponInValidity(coupon, new Date())) {
    return { ok: false, message: "Coupon has expired or is not active yet." };
  }

  const provider = normalizeCode(coupon.CouponProvider || "RAILEATS");
  const couponRestroCode = String(coupon.RestroCode || "").trim();

  if (
    provider === "RESTRO" &&
    couponRestroCode &&
    couponRestroCode !== String(restroCode || "").trim()
  ) {
    return { ok: false, message: "Coupon is not valid for this restaurant." };
  }

  const minimumOrderValue = toNumber(coupon.MinimumOrderValue, 0);
  const maximumOrderValue = toNumber(coupon.MaximumOrderValue, 0);
  const minimumQuantity = toNumber(coupon.MinimumQuantity, 0);
  const maximumQuantity = toNumber(coupon.MaximumQuantity, 0);
  const usageLimitTotal = toNumber(coupon.UsageLimitTotal, 0);
  const usageLimitPerUser = toNumber(coupon.UsageLimitPerUser, 0);
  const usedCount = toNumber(coupon.UsedCount, 0);

  if (minimumOrderValue > 0 && subtotal < minimumOrderValue) {
    return {
      ok: false,
      message: `Add food worth Rs ${Math.ceil(
        minimumOrderValue - subtotal
      )} more to use this coupon.`,
    };
  }

  if (maximumOrderValue > 0 && subtotal > maximumOrderValue) {
    return { ok: false, message: "Coupon is not valid for this order value." };
  }

  if (minimumQuantity > 0 && quantity < minimumQuantity) {
    return { ok: false, message: `Add at least ${minimumQuantity} items to use this coupon.` };
  }

  if (maximumQuantity > 0 && quantity > maximumQuantity) {
    return { ok: false, message: "Coupon is not valid for this item quantity." };
  }

  if (usageLimitTotal > 0 && usedCount >= usageLimitTotal) {
    return { ok: false, message: "Coupon usage limit is reached." };
  }

  const customerUsageCount = await getCouponUsageCount(
    coupon.CouponId,
    normalizeMobile(customerMobile),
    normalizeCode(coupon.CouponFrequency || "UNLIMITED")
  );

  if (usageLimitPerUser > 0 && customerUsageCount >= usageLimitPerUser) {
    return { ok: false, message: "You have already used this coupon." };
  }

  const discountAmount = calculateCouponDiscount(coupon, subtotal);

  if (discountAmount <= 0) {
    return { ok: false, message: "Coupon discount is not applicable." };
  }

  return {
    ok: true,
    coupon,
    discountAmount,
    message: `Coupon applied. You saved Rs ${discountAmount}.`,
  };
}

async function recordCouponUsageSafely({
  coupon,
  couponCode,
  customerMobile,
  orderId,
  discountAmount,
}: {
  coupon: Record<string, any> | null;
  couponCode: string | null;
  customerMobile: string;
  orderId: unknown;
  discountAmount: number;
}) {
  if (!couponCode || !coupon?.CouponId || discountAmount <= 0) return;

  const payload = {
    CouponId: coupon.CouponId,
    CouponCode: couponCode,
    CustomerMobile: normalizeMobile(customerMobile),
    OrderId: orderId,
    DiscountAmount: discountAmount,
    CreatedAt: new Date().toISOString(),
  };

  const { error } = await serviceClient.from("CouponUsage").insert(payload);

  if (error) {
    console.error("COUPON USAGE INSERT ERROR =>", error);
  } else {
    await serviceClient
      .from("Coupons")
      .update({ UsedCount: toNumber(coupon.UsedCount, 0) + 1 })
      .eq("CouponId", coupon.CouponId);
  }
}

function getItemCode(item: any) {
  return Number(
    item?.id ||
      item?.item_code ||
      item?.ItemCode ||
      item?.itemCode ||
      0
  );
}

function cleanOptionalOrderFields(row: Record<string, any>) {
  const next = { ...row };
  delete next.IsAgentOrder;
  return next;
}

function cleanOptionalOrderItemFields(row: Record<string, any>) {
  const next = { ...row };
  delete next.RestroPrice;
  return next;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("RECEIVING FRONTEND BODY =>", body);

    const {
      RestroCode,
      RestroName,
      StationCode,
      StationName,
      DeliveryDate,
      DeliveryTime,
      TrainNumber,
      Coach,
      Seat,
      CustomerName,
      CustomerMobile,
      SubTotal,
      CouponCode,
      CouponDiscount,
      BasePrice,
      GSTAmount,
      PlatformCharge,
      TotalAmount,
      PaymentMode,
      Status,
      Items,
      items,
      PNR,
      BookingSource,
      BookedBy,
      IsAgentOrder,
      JourneyPayload,
    } = body;

    const finalItemsArray = Items || items || JourneyPayload?.items;

    if (!CustomerMobile) {
      return NextResponse.json(
        {
          ok: false,
          error: "mobile_required",
          message: "Mobile number is required",
        },
        { status: 400 }
      );
    }

    if (
      !finalItemsArray ||
      !Array.isArray(finalItemsArray) ||
      finalItemsArray.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "cart_empty",
          message: "No items found in cart. Transaction stopped!",
        },
        { status: 400 }
      );
    }

    const validRestroCode = RestroCode ? Number(RestroCode) : null;

    if (!validRestroCode) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_restro_code",
          message: "Valid Restaurant Code is required",
        },
        { status: 400 }
      );
    }

    const itemCodes = finalItemsArray
      .map((item: any) => getItemCode(item))
      .filter((code: number) => Number.isFinite(code) && code > 0);

    let restroPriceTotal = 0;
    const restroPriceByItemCode: Record<string, number> = {};

    if (itemCodes.length > 0) {
      const { data: menuRows, error: menuError } = await serviceClient
        .from("RestroMenuItems")
        .select("item_code, restro_price")
        .eq("restro_code", validRestroCode)
        .in("item_code", itemCodes);

      if (menuError) {
        console.error("RESTRO PRICE FETCH ERROR =>", menuError);

        return NextResponse.json(
          {
            ok: false,
            error: menuError.code,
            message: menuError.message,
            details: menuError.details,
            hint: menuError.hint,
          },
          { status: 500 }
        );
      }

      (menuRows || []).forEach((row: any) => {
        restroPriceByItemCode[String(row.item_code)] = toNumber(
          row.restro_price,
          0
        );
      });

      restroPriceTotal = finalItemsArray.reduce((sum: number, item: any) => {
        const itemCode = String(getItemCode(item));
        const qty = toNumber(item.qty || item.quantity, 1);

        const fallbackPrice = toNumber(
          item.RestroPrice ||
            item.restro_price ||
            item.base_price ||
            item.BasePrice ||
            item.price ||
            item.selling_price ||
            item.SellingPrice,
          0
        );

        const restroPrice = restroPriceByItemCode[itemCode] ?? fallbackPrice;

        return sum + restroPrice * qty;
      }, 0);
    }

    const bookingSource = detectBookingSource(
      req,
      BookingSource || JourneyPayload?.bookingSource
    );

    const bookedBy =
      BookedBy ||
      JourneyPayload?.bookedBy ||
      (IsAgentOrder || JourneyPayload?.isAgentOrder
        ? `${CustomerName || "Customer"} Agent`
        : CustomerName || "Customer");

    const pnr = PNR || JourneyPayload?.pnr || body?.pnr || null;
    const couponCode = normalizeCouponCode(
      CouponCode ||
        JourneyPayload?.CouponCode ||
        JourneyPayload?.couponCode ||
        JourneyPayload?.promoCode ||
        body?.couponCode ||
        body?.promoCode
    );
    let couponDiscount = normalizeCouponDiscount(
      CouponDiscount ||
        JourneyPayload?.CouponDiscount ||
        JourneyPayload?.couponDiscount ||
        body?.couponDiscount
    );
    let validatedCoupon: Record<string, any> | null = null;

    if (couponCode) {
      const couponValidation: any = await validateCouponForOrder({
        couponCode,
        subtotal: toNumber(SubTotal || BasePrice, 0),
        quantity: finalItemsArray.reduce(
          (sum: number, item: any) => sum + toNumber(item?.qty || item?.Quantity, 0),
          0
        ),
        restroCode: String(validRestroCode),
        customerMobile: CustomerMobile,
      });

      if (!couponValidation.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: "coupon_validation_failed",
            message: couponValidation.message,
          },
          { status: 400 }
        );
      }

      validatedCoupon = couponValidation.coupon || null;
      couponDiscount = normalizeCouponDiscount(couponValidation.discountAmount);
    }

    const mainOrderPayload: Record<string, any> = {
      RestroCode: validRestroCode,
      RestroName: RestroName || "Unknown Restaurant",
      StationCode: StationCode || "N/A",
      StationName: StationName || "N/A",
      DeliveryDate,
      DeliveryTime,
      TrainNumber: TrainNumber || "N/A",
      Coach: Coach || null,
      Seat: Seat || null,
      CustomerName: CustomerName || "Guest",
      CustomerMobile,
      SubTotal: toNumber(SubTotal || BasePrice, 0),
      CouponCode: couponCode,
      CouponDiscount: couponDiscount,
      const finalBasePrice = toNumber(BasePrice || SubTotal, 0);

BasePrice: finalBasePrice,
RestroPrice: toNumber(restroPriceTotal, 0),
Commission: finalBasePrice - toNumber(restroPriceTotal, 0),
GSTAmount: toNumber(GSTAmount, 0),
      PlatformCharge: toNumber(PlatformCharge, 0),
      TotalAmount: toNumber(TotalAmount, 0),
      PaymentMode: PaymentMode || "COD",
      Status: Status || "Booked",
      PNR: pnr,
      BookingSource: bookingSource,
      BookedBy: bookedBy,
      IsAgentOrder: !!(IsAgentOrder || JourneyPayload?.isAgentOrder),
      JourneyPayload: {
        ...body,
        BookingSource: bookingSource,
        BookedBy: bookedBy,
        IsAgentOrder: !!(IsAgentOrder || JourneyPayload?.isAgentOrder),
        CouponId:
          validatedCoupon?.CouponId ||
          body?.CouponId ||
          JourneyPayload?.CouponId ||
          JourneyPayload?.couponId ||
          null,
        CouponCode: couponCode,
        CouponDiscount: couponDiscount,
        couponCode,
        couponDiscount,
        RestroPrice: toNumber(restroPriceTotal, 0),
      },
    };

    let insertResult = await serviceClient
      .from("Orders")
      .insert(mainOrderPayload)
      .select()
      .single();

    if (insertResult.error) {
      const message = insertResult.error.message || "";
      const shouldRetryWithoutOptionalColumns =
        /IsAgentOrder|column|schema cache/i.test(message);

      if (shouldRetryWithoutOptionalColumns) {
        insertResult = await serviceClient
          .from("Orders")
          .insert(cleanOptionalOrderFields(mainOrderPayload))
          .select()
          .single();
      }
    }

    if (insertResult.error) {
      console.error("SUPABASE MAIN ORDER INSERT ERROR =>", insertResult.error);

      return NextResponse.json(
        {
          ok: false,
          error: insertResult.error.code,
          message: insertResult.error.message,
          details: insertResult.error.details,
          hint: insertResult.error.hint,
        },
        { status: 500 }
      );
    }

    const orderData = insertResult.data;
    const targetOrderId = orderData.OrderId;

    const orderItemsPayload = finalItemsArray.map((item: any) => {
      const parsedItemCode = getItemCode(item);

      const singleItemPrice = toNumber(
        item.price ||
          item.base_price ||
          item.BasePrice ||
          item.selling_price ||
          item.SellingPrice,
        0
      );

      const itemQty = toNumber(item.qty || item.quantity, 1);

      const menuRestroPrice =
        restroPriceByItemCode[String(parsedItemCode)] ??
        toNumber(
          item.RestroPrice ||
            item.restro_price ||
            item.base_price ||
            item.BasePrice ||
            singleItemPrice,
          singleItemPrice
        );

      return {
        OrderId: targetOrderId,
        RestroCode: validRestroCode,
        ItemCode: Number.isFinite(parsedItemCode) ? parsedItemCode : 0,
        ItemName: item.name || "Unknown Item",
        ItemDescription: item.description || null,
        ItemCategory: item.category || null,
        Cuisine: item.cuisine || null,
        MenuType: item.menu_type || null,
        BasePrice: singleItemPrice,
        RestroPrice: menuRestroPrice,
        GSTPercent: toNumber(item.gst_percent, 5.0),
        SellingPrice: singleItemPrice,
        Quantity: itemQty,
        LineTotal: singleItemPrice * itemQty,
      };
    });

    let itemsInsertResult = await serviceClient
      .from("OrderItems")
      .insert(orderItemsPayload);

    if (itemsInsertResult.error) {
      const message = itemsInsertResult.error.message || "";
      const shouldRetryWithoutRestroPrice =
        /RestroPrice|column|schema cache/i.test(message);

      if (shouldRetryWithoutRestroPrice) {
        itemsInsertResult = await serviceClient
          .from("OrderItems")
          .insert(orderItemsPayload.map(cleanOptionalOrderItemFields));
      }
    }

    if (itemsInsertResult.error) {
      console.error(
        "SUPABASE ORDER ITEMS BULK INSERT ERROR =>",
        itemsInsertResult.error
      );

      await serviceClient.from("Orders").delete().eq("OrderId", targetOrderId);

      return NextResponse.json(
        {
          ok: false,
          error: itemsInsertResult.error.code,
          message: itemsInsertResult.error.message,
          details: itemsInsertResult.error.details,
          hint: itemsInsertResult.error.hint,
        },
        { status: 500 }
      );
    }

    await recordCouponUsageSafely({
      coupon: validatedCoupon,
      couponCode,
      customerMobile: CustomerMobile,
      orderId: targetOrderId,
      discountAmount: couponDiscount,
    });

    return NextResponse.json({
      ok: true,
      orderId: targetOrderId,
      totalAmount: orderData.TotalAmount,
      restroPrice: orderData.RestroPrice,
    });
  } catch (e: any) {
    console.error("CRITICAL EXCEPTION IN API ROUTE =>", e);

    return NextResponse.json(
      {
        ok: false,
        error: "server_crash",
        message: e?.message || "Server error",
      },
      { status: 500 }
    );
  }
}
