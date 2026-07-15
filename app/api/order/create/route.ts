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

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeCouponCode(value: unknown) {
  const code = String(value || "").trim().toUpperCase();
  return code || null;
}

function normalizeCouponDiscount(value: unknown) {
  const amount = toNumber(value, 0);
  return amount > 0 ? roundMoney(amount) : 0;
}

function normalizeMobile(value: unknown) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(-10);
}

function normalizeCode(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function getCouponId(coupon?: Record<string, any> | null) {
  if (!coupon) return null;

  return (
    coupon.CouponId ??
    coupon.coupon_id ??
    coupon.couponId ??
    coupon.id ??
    null
  );
}

function isCouponActive(coupon: Record<string, any>) {
  const value = coupon?.IsActive;

  return value === true || value === 1 || String(value).toLowerCase() === "true";
}

function isCouponVisible(coupon: Record<string, any>) {
  const value = coupon?.ShowToCustomer;

  return value === true || value === 1 || String(value).toLowerCase() === "true";
}

function calculateCouponDiscount(coupon: Record<string, any>, basePrice: number) {
  const type = normalizeCode(coupon.CouponType || "FLAT");
  const value = toNumber(coupon.DiscountValue, 0);
  const maxDiscount = toNumber(coupon.MaximumDiscountAmount, 0);

  let discount = type === "PERCENT" ? (basePrice * value) / 100 : value;

  if (maxDiscount > 0) {
    discount = Math.min(discount, maxDiscount);
  }

  discount = Math.min(discount, basePrice);

  return Math.max(0, roundMoney(discount));
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
  return row.CreatedAt || row.created_at || row.UsedAt || row.used_at || row.createdAt || "";
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
  basePrice,
  quantity,
  restroCode,
  customerMobile,
}: {
  couponCode: string;
  basePrice: number;
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

  if (minimumOrderValue > 0 && basePrice < minimumOrderValue) {
    return {
      ok: false,
      message: `Add food worth Rs ${Math.ceil(
        minimumOrderValue - basePrice
      )} more to use this coupon.`,
    };
  }

  if (maximumOrderValue > 0 && basePrice > maximumOrderValue) {
    return { ok: false, message: "Coupon is not valid for this order value." };
  }

  if (minimumQuantity > 0 && quantity < minimumQuantity) {
    return {
      ok: false,
      message: `Add at least ${minimumQuantity} items to use this coupon.`,
    };
  }

  if (maximumQuantity > 0 && quantity > maximumQuantity) {
    return { ok: false, message: "Coupon is not valid for this item quantity." };
  }

  if (usageLimitTotal > 0 && usedCount >= usageLimitTotal) {
    return { ok: false, message: "Coupon usage limit is reached." };
  }

  const couponId = getCouponId(coupon);

  const customerUsageCount = await getCouponUsageCount(
    couponId,
    normalizeMobile(customerMobile),
    normalizeCode(coupon.CouponFrequency || "UNLIMITED")
  );

  if (usageLimitPerUser > 0 && customerUsageCount >= usageLimitPerUser) {
    return { ok: false, message: "You have already used this coupon." };
  }

  const discountAmount = calculateCouponDiscount(coupon, basePrice);

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
  const couponId = getCouponId(coupon);

  if (!couponCode || !couponId || discountAmount <= 0) {
    return;
  }

  const payload = {
    CouponId: couponId,
    CouponCode: couponCode,
    CustomerMobile: normalizeMobile(customerMobile),
    OrderId: orderId,
    DiscountAmount: discountAmount,
    CreatedAt: new Date().toISOString(),
  };

  const { error } = await serviceClient.from("CouponUsage").insert(payload);

  if (error) {
    console.error("COUPON USAGE INSERT ERROR =>", error);
    return;
  }

  await serviceClient
    .from("Coupons")
    .update({ UsedCount: toNumber(coupon?.UsedCount, 0) + 1 })
    .eq("CouponId", couponId);
}

function getItemCode(item: any) {
  return Number(item?.id || item?.item_code || item?.ItemCode || item?.itemCode || 0);
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
      BasePrice,
      CouponCode,
      CouponDiscount,
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
        { ok: false, error: "mobile_required", message: "Mobile number is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(finalItemsArray) || finalItemsArray.length === 0) {
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

    if (!validRestroCode || !Number.isFinite(validRestroCode)) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_restro_code",
          message: "Valid Restaurant Code is required",
        },
        { status: 400 }
      );
    }

    const finalBasePrice = toNumber(BasePrice ?? SubTotal, 0);

    const itemCodes = Array.from(
      new Set(
        finalItemsArray
          .map((item: any) => getItemCode(item))
          .filter((code: number) => Number.isFinite(code) && code > 0)
      )
    );

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
        restroPriceByItemCode[String(row.item_code)] = toNumber(row.restro_price, 0);
      });
    }

    restroPriceTotal = finalItemsArray.reduce((sum: number, item: any) => {
      const itemCode = String(getItemCode(item));
      const quantity = Math.max(1, toNumber(item?.qty ?? item?.quantity ?? item?.Quantity, 1));

      const fallbackRestroPrice = toNumber(
        item?.RestroPrice ??
          item?.restro_price ??
          item?.base_price ??
          item?.BasePrice ??
          item?.price ??
          item?.selling_price ??
          item?.SellingPrice,
        0
      );

      const unitRestroPrice = restroPriceByItemCode[itemCode] ?? fallbackRestroPrice;

      return sum + unitRestroPrice * quantity;
    }, 0);

    const finalRestroPrice = Math.max(0, roundMoney(restroPriceTotal));
    const finalCommission = roundMoney(finalBasePrice - finalRestroPrice);

    const bookingSource = detectBookingSource(req, BookingSource || JourneyPayload?.bookingSource);

    const isAgentOrder = !!(IsAgentOrder || JourneyPayload?.isAgentOrder);

    const bookedBy =
      BookedBy ||
      JourneyPayload?.bookedBy ||
      (isAgentOrder ? `${CustomerName || "Customer"} Agent` : CustomerName || "Customer");

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
      CouponDiscount || JourneyPayload?.CouponDiscount || JourneyPayload?.couponDiscount || body?.couponDiscount
    );

    let validatedCoupon: Record<string, any> | null = null;

    if (couponCode) {
      const totalQuantity = finalItemsArray.reduce(
        (sum: number, item: any) => sum + toNumber(item?.qty ?? item?.quantity ?? item?.Quantity, 0),
        0
      );

      const couponValidation: any = await validateCouponForOrder({
        couponCode,
        basePrice: finalBasePrice,
        quantity: totalQuantity,
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

    const couponId =
      getCouponId(validatedCoupon) ||
      body?.CouponId ||
      body?.couponId ||
      JourneyPayload?.CouponId ||
      JourneyPayload?.couponId ||
      null;

    const couponProvider = normalizeCode(
      validatedCoupon?.CouponProvider ||
        body?.CouponProvider ||
        body?.couponProvider ||
        JourneyPayload?.CouponProvider ||
        JourneyPayload?.couponProvider ||
        "RAILEATS"
    );

    let restroDiscount = 0;
    let reDiscount = 0;

    if (couponDiscount > 0) {
      if (couponProvider === "RESTRO") {
        restroDiscount = couponDiscount;
        reDiscount = 0;
      } else if (couponProvider === "BOTH") {
        const half = roundMoney(couponDiscount / 2);
        restroDiscount = half;
        reDiscount = roundMoney(couponDiscount - half);
      } else {
        restroDiscount = 0;
        reDiscount = couponDiscount;
      }
    }

    restroDiscount = roundMoney(restroDiscount);
    reDiscount = roundMoney(reDiscount);

const finalDiscountedBasePrice = Math.max(
  0,
  roundMoney(
    finalBasePrice - couponDiscount
  )
);
        /*
     * PAYMENT AMOUNT BREAKUP
     *
     * COD:
     * CODAmount = TotalAmount
     * PPDAmount = 0
     *
     * PPD / ONLINE / PREPAID:
     * CODAmount = 0
     * PPDAmount = TotalAmount
     */
    const finalTotalAmount = Math.max(
      0,
      roundMoney(
        toNumber(
          TotalAmount,
          0
        )
      )
    );

    const normalizedPaymentMode =
      normalizeCode(
        PaymentMode || "COD"
      );

    const isPrepaidOrder = [
      "PPD",
      "PREPAID",
      "PREPIAD",
      "ONLINE",
      "PAIDONLINE",
      "RAZORPAY",
    ].includes(
      normalizedPaymentMode
    );

    const codAmount =
      isPrepaidOrder
        ? 0
        : finalTotalAmount;

    const ppdAmount =
      isPrepaidOrder
        ? finalTotalAmount
        : 0;


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

      SubTotal: finalBasePrice,
      BasePrice: finalBasePrice,
      DiscountedBasePrice: finalDiscountedBasePrice,
      RestroPrice: finalRestroPrice,
      Commission: finalCommission,

      CouponId: couponId,
      CouponCode: couponCode,
      CouponDiscount: couponDiscount,
      RestroDiscount: restroDiscount,
      REDiscount: reDiscount,

            GSTAmount: toNumber(
        GSTAmount,
        0
      ),

      PlatformCharge: toNumber(
        PlatformCharge,
        0
      ),

      TotalAmount:
        finalTotalAmount,

      PaymentMode:
        PaymentMode || "COD",

      CODAmount:
        codAmount,

      PPDAmount:
        ppdAmount,
      Status: Status || "Booked",
      PNR: pnr,
      BookingSource: bookingSource,
      BookedBy: bookedBy,
      IsAgentOrder: isAgentOrder,

      JourneyPayload: {
        ...body,
        BookingSource: bookingSource,
        BookedBy: bookedBy,
        IsAgentOrder: isAgentOrder,

        CouponId: couponId,
        CouponProvider: couponProvider,
        CouponCode: couponCode,
        CouponDiscount: couponDiscount,
        RestroDiscount: restroDiscount,
        REDiscount: reDiscount,

        couponId,
        couponProvider,
        couponCode,
        couponDiscount,
        restroDiscount,
        reDiscount,

                BasePrice:
  finalBasePrice,

DiscountedBasePrice:
  finalDiscountedBasePrice,

RestroPrice:
  finalRestroPrice,

        Commission:
          finalCommission,

        TotalAmount:
          finalTotalAmount,

        PaymentMode:
          PaymentMode || "COD",

        CODAmount:
          codAmount,

        PPDAmount:
          ppdAmount,
      },
    };

    let insertResult = await serviceClient
      .from("Orders")
      .insert(mainOrderPayload)
      .select()
      .single();

    if (insertResult.error) {
      const message = insertResult.error.message || "";
      const shouldRetryWithoutOptionalColumns = /IsAgentOrder|column|schema cache/i.test(message);

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

    if (!targetOrderId) {
      return NextResponse.json(
        {
          ok: false,
          error: "order_id_missing",
          message: "Order created but OrderId was not returned.",
        },
        { status: 500 }
      );
    }

    const orderItemsPayload = finalItemsArray.map((item: any) => {
      const parsedItemCode = getItemCode(item);

      const singleItemBasePrice = toNumber(
        item?.price ??
          item?.base_price ??
          item?.BasePrice ??
          item?.selling_price ??
          item?.SellingPrice,
        0
      );

      const itemQuantity = Math.max(1, toNumber(item?.qty ?? item?.quantity ?? item?.Quantity, 1));

      const menuRestroPrice =
        restroPriceByItemCode[String(parsedItemCode)] ??
        toNumber(
          item?.RestroPrice ??
            item?.restro_price ??
            item?.base_price ??
            item?.BasePrice ??
            singleItemBasePrice,
          singleItemBasePrice
        );

      return {
        OrderId: targetOrderId,
        RestroCode: validRestroCode,
        ItemCode: Number.isFinite(parsedItemCode) ? parsedItemCode : 0,
        ItemName: item?.name || item?.ItemName || "Unknown Item",
        ItemDescription: item?.description || item?.ItemDescription || null,
        ItemCategory: item?.category || item?.ItemCategory || null,
        Cuisine: item?.cuisine || item?.Cuisine || null,
        MenuType: item?.menu_type || item?.menuType || item?.MenuType || null,
        BasePrice: singleItemBasePrice,
        RestroPrice: menuRestroPrice,
        GSTPercent: toNumber(item?.gst_percent ?? item?.GSTPercent, 5),
        SellingPrice: singleItemBasePrice,
        Quantity: itemQuantity,
        LineTotal: singleItemBasePrice * itemQuantity,
      };
    });

    let itemsInsertResult = await serviceClient.from("OrderItems").insert(orderItemsPayload);

    if (itemsInsertResult.error) {
      const message = itemsInsertResult.error.message || "";
      const shouldRetryWithoutRestroPrice = /RestroPrice|column|schema cache/i.test(message);

      if (shouldRetryWithoutRestroPrice) {
        itemsInsertResult = await serviceClient
          .from("OrderItems")
          .insert(orderItemsPayload.map(cleanOptionalOrderItemFields));
      }
    }

    if (itemsInsertResult.error) {
      console.error("SUPABASE ORDER ITEMS BULK INSERT ERROR =>", itemsInsertResult.error);

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
      basePrice: orderData.BasePrice,
      restroPrice: orderData.RestroPrice,
      commission: orderData.Commission,
      couponId,
      couponProvider,
      couponCode,
      couponDiscount,
      restroDiscount,
      reDiscount,
            paymentMode:
        PaymentMode || "COD",

      codAmount,
      ppdAmount,
    });
  } catch (error: any) {
    console.error("CRITICAL EXCEPTION IN API ROUTE =>", error);

    return NextResponse.json(
      {
        ok: false,
        error: "server_crash",
        message: error?.message || "Server error",
      },
      { status: 500 }
    );
  }
}
