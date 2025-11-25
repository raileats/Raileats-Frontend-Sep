// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/** ---- Types coming from frontend ---- */
type IncomingItem = {
  id?: number;
  name?: string;
  itemName?: string;
  price?: number | string;
  unitPrice?: number | string;
  qty?: number | string;
  quantity?: number | string;
};

type IncomingJourney = {
  trainNo?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  pnr?: string;
  coach?: string;
  seat?: string;
  name?: string;
  mobile?: string;
};

type IncomingOutlet = {
  restroCode?: number | string;
  RestroCode?: number | string;
  outletName?: string;
  RestroName?: string;
  stationCode?: string;
  StationCode?: string;
  stationName?: string;
  StationName?: string;
};

type NormalisedItem = {
  ItemCode: number;
  ItemName: string;
  BasePrice: number;
  GSTPercent: number | null;
  SellingPrice: number | null;
  Quantity: number;
  LineTotal: number;
};

/** ---- Helpers ---- */

function toNumber(n: any, fallback = 0): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function normaliseTimeHHMM(t?: string | null): string {
  if (!t) return "00:00:00";
  const s = String(t).trim();
  if (!s) return "00:00:00";
  const [hh = "00", mm = "00"] = s.split(":");
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:00`;
}

function todayYMD() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** ---- POST /api/orders ---- */
export async function POST(req: Request) {
  try {
    const body: any = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "invalid_json" },
        { status: 400 },
      );
    }

    // ----- 1) ITEMS (cart lines) -----
    let rawItems: IncomingItem[] = [];

    if (Array.isArray(body.items)) rawItems = body.items;
    else if (Array.isArray(body.lines)) rawItems = body.lines;
    else if (Array.isArray(body.cartLines)) rawItems = body.cartLines;

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "empty_items",
          debugKeys: Object.keys(body),
        },
        { status: 400 },
      );
    }

    const normItems: NormalisedItem[] = rawItems.map((it, idx) => {
      const qty = toNumber(it.qty ?? it.quantity ?? 0, 0);
      const price = toNumber(it.price ?? it.unitPrice ?? 0, 0);

      return {
        ItemCode: toNumber(it.id ?? idx + 1, idx + 1),
        ItemName: String(it.name ?? it.itemName ?? "Item").slice(0, 200),
        BasePrice: price,
        GSTPercent: null,
        SellingPrice: null,
        Quantity: qty,
        LineTotal: qty * price,
      };
    });

    const filteredItems = normItems.filter((i) => i.Quantity > 0);
    if (!filteredItems.length) {
      return NextResponse.json(
        { ok: false, error: "no_positive_qty_items" },
        { status: 400 },
      );
    }

    // totals (fallback if frontend ne nahi bheja)
    const subtotalFromItems = filteredItems.reduce(
      (sum, it) => sum + it.LineTotal,
      0,
    );

    const subTotal = toNumber(body.subtotal, subtotalFromItems);
    const gstAmount = toNumber(body.gst ?? body.gstAmount, 0);
    const platformCharge = toNumber(body.platformCharge, 0);
    const totalAmount = toNumber(
      body.total,
      subTotal + gstAmount + platformCharge,
    );

    // ----- 2) JOURNEY + OUTLET META -----
    const journey: IncomingJourney = body.journey || {};
    const outlet: IncomingOutlet = body.outlet || {};

    const restroCode = toNumber(
      outlet.restroCode ?? outlet.RestroCode,
      NaN,
    );
    const stationCode =
      (outlet.stationCode ?? outlet.StationCode ?? "").toString().toUpperCase();

    if (!Number.isFinite(restroCode) || !stationCode) {
      return NextResponse.json(
        { ok: false, error: "missing_outlet_meta" },
        { status: 400 },
      );
    }

    const restroName =
      outlet.RestroName ??
      outlet.outletName ??
      "Restaurant " + String(restroCode);
    const stationName = outlet.StationName ?? outlet.stationName ?? stationCode;

    const trainNumber = String(journey.trainNo ?? "").trim();
    const customerMobile = String(journey.mobile ?? "").trim();

    if (!trainNumber || !customerMobile) {
      return NextResponse.json(
        { ok: false, error: "missing_journey_meta" },
        { status: 400 },
      );
    }

    const deliveryDate = (journey.deliveryDate || todayYMD()).slice(0, 10);
    const deliveryTime = normaliseTimeHHMM(journey.deliveryTime);

    const customerName = String(journey.name ?? "").slice(0, 120) || null;
    const coach = String(journey.coach ?? "").slice(0, 20) || null;
    const seat = String(journey.seat ?? "").slice(0, 20) || null;

    const paymentMode: "COD" | "ONLINE" =
      body.paymentMode === "ONLINE" ? "ONLINE" : "COD";

    // ----- 3) BUILD DB PAYLOADS -----
    const supa = serviceClient;

    // create order id (RE-YYYYMMDDHHMMSS-random)
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const orderId = `RE-${stamp}-${Math.floor(Math.random() * 900 + 100)}`;

    // Orders row
    const orderRow = {
      OrderId: orderId,
      RestroCode: restroCode,
      RestroName: restroName,
      StationCode: stationCode,
      StationName: stationName,
      DeliveryDate: deliveryDate,
      DeliveryTime: deliveryTime,
      TrainNumber: trainNumber,
      Coach: coach,
      Seat: seat,
      CustomerName: customerName,
      CustomerMobile: customerMobile,
      SubTotal: subTotal,
      GSTAmount: gstAmount,
      PlatformCharge: platformCharge,
      TotalAmount: totalAmount,
      PaymentMode: paymentMode,
      Status: "Booked" as const,
      JourneyPayload: journey,
    };

    // OrderItems rows
    const itemRows = filteredItems.map((it) => ({
      OrderId: orderId,
      RestroCode: restroCode,
      ItemCode: it.ItemCode,
      ItemName: it.ItemName,
      ItemDescription: null,
      ItemCategory: null,
      Cuisine: null,
      MenuType: null,
      BasePrice: it.BasePrice,
      GSTPercent: it.GSTPercent,
      SellingPrice: it.SellingPrice,
      Quantity: it.Quantity,
      LineTotal: it.LineTotal,
    }));

    // Status history row
    const statusRow = {
      OrderId: orderId,
      OldStatus: null,
      NewStatus: "Booked",
      Note: "Order created from website",
      ChangedBy: "system",
    };

    // ----- 4) Insert into Supabase -----
    const { error: orderErr } = await supa.from("Orders").insert(orderRow);
    if (orderErr) {
      console.error("Orders insert error", orderErr);
      return NextResponse.json(
        { ok: false, error: "db_orders_error" },
        { status: 500 },
      );
    }

    const { error: itemsErr } = await supa.from("OrderItems").insert(itemRows);
    if (itemsErr) {
      console.error("OrderItems insert error", itemsErr);
      // NOTE: order ban chuka hai, is case me bhi user ko success dikha sakte hain
    }

    const { error: histErr } = await supa
      .from("OrderStatusHistory")
      .insert(statusRow);
    if (histErr) {
      console.error("OrderStatusHistory insert error", histErr);
    }

    return NextResponse.json({
      ok: true,
      orderId,
    });
  } catch (err) {
    console.error("orders.POST server_error", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }
}

/** Optional: simple GET to test API is live */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "orders api alive",
  });
}
