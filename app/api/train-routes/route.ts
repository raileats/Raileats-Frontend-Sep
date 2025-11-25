// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "../../../lib/supabaseServer";

type DraftItem = {
  id: number;
  name: string;
  price: number;
  qty: number;
};

type DraftJourney = {
  trainNo: string;
  deliveryDate: string;   // "YYYY-MM-DD"
  deliveryTime: string;   // "HH:MM"
  pnr: string;
  coach: string;
  seat: string;
  name: string;
  mobile: string;
};

type DraftOutlet = {
  stationCode: string;
  stationName?: string;
  restroCode: string | number;
  outletName?: string;
};

type DraftOrder = {
  id: string;
  items: DraftItem[];
  count: number;
  subtotal: number;
  journey: DraftJourney;
  outlet: DraftOutlet | null;
  createdAt: number;
};

type Pricing = {
  subtotal: number;
  gst: number;
  platformCharge: number;
  total: number;
};

type OrderPayload = {
  paymentMode: string; // "COD" or "ONLINE"
  draft: DraftOrder;
  pricing: Pricing;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as OrderPayload | null;
    if (!body) {
      return NextResponse.json(
        { ok: false, error: "invalid_json" },
        { status: 400 },
      );
    }

    const { paymentMode, draft, pricing } = body;

    if (!draft?.outlet) {
      return NextResponse.json(
        { ok: false, error: "missing_outlet" },
        { status: 400 },
      );
    }

    const outlet = draft.outlet;
    const j = draft.journey;
    const p = pricing;

    if (!j?.trainNo || !j.deliveryDate || !j.deliveryTime) {
      return NextResponse.json(
        { ok: false, error: "missing_journey" },
        { status: 400 },
      );
    }

    if (!j.mobile) {
      return NextResponse.json(
        { ok: false, error: "missing_mobile" },
        { status: 400 },
      );
    }

    const restroCodeNum = Number(outlet.restroCode);
    if (!Number.isFinite(restroCodeNum)) {
      return NextResponse.json(
        { ok: false, error: "bad_restro_code" },
        { status: 400 },
      );
    }

    const orderId = `ORD${Date.now()}`;

    const supa = serviceClient;

    // 1) Orders table insert
    const { error: orderErr } = await supa.from("Orders").insert({
      OrderId: orderId,
      RestroCode: restroCodeNum,
      RestroName: outlet.outletName ?? "",
      StationCode: outlet.stationCode,
      StationName: outlet.stationName ?? "",
      DeliveryDate: j.deliveryDate,          // "YYYY-MM-DD"
      DeliveryTime: j.deliveryTime,          // "HH:MM"
      TrainNumber: String(j.trainNo),
      Coach: j.coach || null,
      Seat: j.seat || null,
      CustomerName: j.name || null,
      CustomerMobile: j.mobile,
      SubTotal: p.subtotal,
      GSTAmount: p.gst,
      PlatformCharge: p.platformCharge,
      TotalAmount: p.total,
      PaymentMode: paymentMode,
      Status: "Booked",
      JourneyPayload: {
        pnr: j.pnr,
        coach: j.coach,
        seat: j.seat,
        name: j.name,
        mobile: j.mobile,
        trainNo: j.trainNo,
        deliveryDate: j.deliveryDate,
        deliveryTime: j.deliveryTime,
      },
    });

    if (orderErr) {
      console.error("Orders insert failed", orderErr);
      return NextResponse.json(
        { ok: false, error: "orders_insert_failed" },
        { status: 500 },
      );
    }

    // 2) OrderItems insert (agar items hain)
    if (Array.isArray(draft.items) && draft.items.length > 0) {
      const itemsPayload = draft.items.map((it) => ({
        OrderId: orderId,
        RestroCode: restroCodeNum,
        ItemCode: it.id, // abhi id ko hi ItemCode rakh rahe
        ItemName: it.name,
        ItemDescription: null,
        ItemCategory: null,
        Cuisine: null,
        MenuType: null,
        BasePrice: it.price,
        GSTPercent: 5, // aapka abhi flat 5% GST
        SellingPrice: it.price,
        Quantity: it.qty,
        LineTotal: it.price * it.qty,
      }));

      const { error: itemsErr } = await supa
        .from("OrderItems")
        .insert(itemsPayload);

      if (itemsErr) {
        console.error("OrderItems insert failed", itemsErr);
        // order already created, isko sirf log kar rahe hain
      }
    }

    // 3) Status history
    const { error: statusErr } = await supa.from("OrderStatusHistory").insert({
      OrderId: orderId,
      OldStatus: null,
      NewStatus: "Booked",
      Note: "Order created via website",
      ChangedBy: "system",
    });

    if (statusErr) {
      console.error("OrderStatusHistory insert failed", statusErr);
    }

    return NextResponse.json({
      ok: true,
      orderId,
    });
  } catch (e) {
    console.error("orders POST server_error", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }
}
