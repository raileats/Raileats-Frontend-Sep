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

function cleanOptionalOrderFields(row: Record<string, any>) {
  const next = { ...row };
  delete next.IsAgentOrder;
  return next;
}

function toNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getItemCode(item: any) {
  return Number(item?.id || item?.item_code || item?.ItemCode || item?.itemCode || 0);
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

    /* ================= RESTRO PRICE CALCULATION ================= */
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
        console.error("RESTRO PRICE FETCH ERROR =>", menuError.message);

        return NextResponse.json(
          {
            ok: false,
            error: menuError.code,
            message: "Unable to fetch restaurant price for selected items.",
          },
          { status: 500 }
        );
      }

      (menuRows || []).forEach((row: any) => {
        restroPriceByItemCode[String(row.item_code)] = toNumber(row.restro_price, 0);
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

    const calculatedBasePrice = toNumber(BasePrice || SubTotal, 0);

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
      BasePrice: calculatedBasePrice,
      RestroPrice: toNumber(restroPriceTotal, 0),
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
      console.error(
        "SUPABASE MAIN ORDER INSERT ERROR =>",
        insertResult.error.message
      );

      return NextResponse.json(
        {
          ok: false,
          error: insertResult.error.code,
          message: insertResult.error.message,
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

    const { error: itemsError } = await serviceClient
      .from("OrderItems")
      .insert(orderItemsPayload);

    if (itemsError) {
      console.error(
        "SUPABASE ORDER ITEMS BULK INSERT ERROR =>",
        itemsError.message
      );

      await serviceClient.from("Orders").delete().eq("OrderId", targetOrderId);

      return NextResponse.json(
        {
          ok: false,
          error: itemsError.code,
          if (itemsError) {
  console.error(
    "SUPABASE ORDER ITEMS BULK INSERT ERROR =>",
    itemsError
  );

  await serviceClient
    .from("Orders")
    .delete()
    .eq("OrderId", targetOrderId);

  return NextResponse.json(
    {
      ok: false,
      error: itemsError.code,
      message: itemsError.message,
      details: itemsError.details,
      hint: itemsError.hint,
    },
    { status: 500 }
  );
}
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      orderId: targetOrderId,
      totalAmount: orderData.TotalAmount,
      restroPrice: orderData.RestroPrice,
    });
  } catch (e: any) {
    console.error("CRITICAL EXCEPTION IN API ROUTE =>", e.message);

    return NextResponse.json(
      {
        ok: false,
        error: "server_crash",
        message: e.message,
      },
      { status: 500 }
    );
  }
}
