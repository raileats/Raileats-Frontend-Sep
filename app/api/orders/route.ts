// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "../../../lib/supabaseServer";

// TABLE TYPES (for Supabase strict mode)
type OrderItemPayload = {
  id?: number; // menu item id
  name: string;
  price: number;
  qty: number;
};

type JourneyPayload = {
  trainNo: string;
  deliveryDate: string;
  deliveryTime: string;
  pnr?: string;
  coach?: string;
  seat?: string;
  name?: string;
  mobile: string;
};

type OutletMeta = {
  restroCode: number;
  restroName: string;
  stationCode: string;
  stationName: string;
};

type OrderPayload = {
  id: string; // UI generated
  items: OrderItemPayload[];
  subtotal: number;
  gst?: number;
  platformCharge?: number;
  total: number;
  paymentMode: "COD" | "ONLINE";
  journey: JourneyPayload;
  outlet: OutletMeta;
  createdAt: number;
};

function fail(msg: string, code = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status: code });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as OrderPayload;

    // -------- BASIC VALIDATION ----------
    if (!body?.items?.length) return fail("empty_items");
    if (!body.journey) return fail("missing_journey");
    if (!body.outlet) return fail("missing_outlet");

    const {
      journey,
      outlet,
      subtotal,
      total,
      gst,
      platformCharge,
      items,
      paymentMode,
    } = body;

    if (!journey.trainNo) return fail("missing_train_no");
    if (!journey.deliveryDate) return fail("missing_delivery_date");
    if (!journey.deliveryTime) return fail("missing_delivery_time");
    if (!journey.mobile) return fail("missing_mobile");
    if (!outlet.restroCode) return fail("missing_restro_code");
    if (!outlet.stationCode) return fail("missing_station_code");

    const supa = serviceClient;

    // -------- CREATE ORDER RECORD --------
    const orderId = body.id || `RE-${Date.now()}`;

    const { data: orderInsert, error: orderErr } = await supa
      .from("Orders")
      .insert([
        {
          OrderId: orderId,
          RestroCode: outlet.restroCode,
          RestroName: outlet.restroName,
          StationCode: outlet.stationCode,
          StationName: outlet.stationName,

          DeliveryDate: journey.deliveryDate,
          DeliveryTime: journey.deliveryTime,
          TrainNumber: journey.trainNo,

          Coach: journey.coach || null,
          Seat: journey.seat || null,
          CustomerName: journey.name || null,
          CustomerMobile: journey.mobile,

          SubTotal: subtotal,
          GSTAmount: gst || 0,
          PlatformCharge: platformCharge || 0,
          TotalAmount: total,
          PaymentMode: paymentMode,

          JourneyPayload: journey, // full JSON
        },
      ])
      .select("OrderId")
      .single();

    if (orderErr) {
      console.error("SUPABASE Orders insert ERROR:", orderErr);
      return fail("order_insert_failed", 500);
    }

    // --------- INSERT ITEMS ----------
    const itemRows = items.map((x) => ({
      OrderId: orderId,
      RestroCode: outlet.restroCode,

      ItemCode: x.id || 0,
      ItemName: x.name,
      Quantity: x.qty,

      BasePrice: x.price,
      SellingPrice: x.price,
      LineTotal: x.price * x.qty,
    }));

    const { error: itemErr } = await supa.from("OrderItems").insert(itemRows);

    if (itemErr) {
      console.error("OrderItems insert ERROR:", itemErr);

      // rollback (delete order)
      await supa.from("Orders").delete().eq("OrderId", orderId);
      return fail("order_items_failed", 500);
    }

    // -------- STATUS HISTORY ----------
    const { error: histErr } = await supa.from("OrderStatusHistory").insert([
      {
        OrderId: orderId,
        OldStatus: null,
        NewStatus: paymentMode === "ONLINE" ? "PAYMENT_PENDING" : "BOOKED",
        Note: "Order Created",
        ChangedBy: "SYSTEM",
      },
    ]);

    if (histErr) {
      console.error("StatusHistory insert ERROR:", histErr);
      return fail("status_history_failed", 500);
    }

    return NextResponse.json({
      ok: true,
      orderId,
    });
  } catch (err) {
    console.error("orders.api fatal", err);
    return fail("server_error", 500);
  }
}
