// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";

/** ---------- Incoming types (loose) ---------- */

type IncomingItem = {
  id?: number;
  itemId?: number;
  item_code?: number;
  name?: string;
  itemName?: string;
  title?: string;
  price?: number | string;
  base_price?: number | string;
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
  restro_id?: number | string;
  outletName?: string;
  RestroName?: string;
  stationCode?: string;
  StationCode?: string;
  stationName?: string;
  StationName?: string;
};

/** RestroMenuItems row (metadata for items) */
type RestroMenuItemRow = {
  id: number;
  item_description?: string | null;
  item_category?: string | null;
  item_cuisine?: string | null;
  menu_type?: string | null;
  gst_percent?: number | null;
  selling_price?: number | null;
};

/** ---------- Helpers ---------- */

function toNumber(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normTimeHHMMSS(t?: string | null) {
  if (!t) return "00:00:00";
  const s = String(t).trim();
  if (!s) return "00:00:00";
  const [hh = "00", mm = "00"] = s.split(":");
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:00`;
}

/** ---------- POST /api/orders ---------- */
export async function POST(req: Request) {
  try {
    const body: any = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "invalid_json" },
        { status: 400 },
      );
    }

    // review page se aa raha payload
    const draft: any = body.draft || {};
    const pricing: any = body.pricing || {};

    /* ---- 1) ITEMS (cart lines) ---- */

    let rawItems: IncomingItem[] = [];

    if (Array.isArray(body.items)) rawItems = body.items;
    else if (Array.isArray(draft.items)) rawItems = draft.items;
    else if (Array.isArray(draft.lines)) rawItems = draft.lines;
    else if (Array.isArray(body.lines)) rawItems = body.lines;
    else if (Array.isArray(body.cartLines)) rawItems = body.cartLines;

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "empty_items",
          debugKeys: Object.keys(body),
          draftKeys: Object.keys(draft || {}),
        },
        { status: 400 },
      );
    }

    const normItems = rawItems
      .map((it, idx) => {
        const qty = toNumber(it.qty ?? it.quantity, 0);
        const price = toNumber(
          it.price ?? it.base_price ?? it.unitPrice,
          0,
        );
        if (qty <= 0 || !Number.isFinite(price) || price <= 0) return null;

        const code =
          it.id ?? it.itemId ?? it.item_code ?? (idx + 1);

        const name =
          it.name ?? it.itemName ?? it.title ?? `Item ${idx + 1}`;

        const lineTotal = qty * price;

        return {
          ItemCode: toNumber(code, idx + 1),
          ItemName: String(name).slice(0, 200),
          BasePrice: price,
          GSTPercent: null as number | null,
          SellingPrice: null as number | null,
          Quantity: qty,
          LineTotal: lineTotal,
        };
      })
      .filter(Boolean) as {
      ItemCode: number;
      ItemName: string;
      BasePrice: number;
      GSTPercent: number | null;
      SellingPrice: number | null;
      Quantity: number;
      LineTotal: number;
    }[];

    if (!normItems.length) {
      return NextResponse.json(
        { ok: false, error: "no_valid_items" },
        { status: 400 },
      );
    }

    const subtotalFromItems = normItems.reduce(
      (sum, it) => sum + it.LineTotal,
      0,
    );

    const SubTotal = toNumber(
      pricing.subtotal ?? draft.subtotal ?? body.subtotal,
      subtotalFromItems,
    );
    const GSTAmount = toNumber(
      pricing.gst ?? pricing.gstAmount ?? body.gst ?? body.gstAmount,
      0,
    );
    const PlatformCharge = toNumber(
      pricing.platformCharge ?? body.platformCharge,
      0,
    );
    const TotalAmount = toNumber(
      pricing.total ?? body.total,
      SubTotal + GSTAmount + PlatformCharge,
    );

    /* ---- 2) OUTLET + JOURNEY ---- */

    const outlet: IncomingOutlet =
      draft.outlet ||
      draft.outletMeta ||
      body.outlet ||
      body.outletMeta ||
      {};

    const restroCode = toNumber(
      outlet.restroCode ??
        outlet.RestroCode ??
        outlet.restro_id ??
        draft.restroCode ??
        body.restroCode ??
        body.RestroCode,
      NaN,
    );
    const stationCodeRaw =
      outlet.stationCode ??
      outlet.StationCode ??
      draft.stationCode ??
      body.stationCode ??
      body.StationCode ??
      "";

    const stationCode = String(stationCodeRaw || "").toUpperCase();

    if (!Number.isFinite(restroCode) || !stationCode) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_outlet_meta",
          debug: { restroCode, stationCode },
        },
        { status: 400 },
      );
    }

    const restroNameRaw =
      outlet.RestroName ??
      outlet.outletName ??
      draft.RestroName ??
      draft.outletName ??
      body.RestroName ??
      body.outletName ??
      `Restro ${restroCode}`;

    const restroName = String(restroNameRaw || "").slice(0, 200);

    const stationNameRaw =
      outlet.StationName ??
      outlet.stationName ??
      draft.StationName ??
      draft.stationName ??
      body.StationName ??
      body.stationName ??
      "";

    // agar stationName empty ho to कम से कम stationCode save karo
    const stationName =
      String(stationNameRaw || "").trim() || stationCode;

    // journey – draft/journey से
    const journey: IncomingJourney =
      draft.journey ||
      draft.journeyDetails ||
      body.journey ||
      body.journeyDetails || {
        trainNo: body.trainNo ?? body.TrainNumber,
        deliveryDate: body.deliveryDate,
        deliveryTime: body.deliveryTime,
        pnr: body.pnr,
        coach: body.coach,
        seat: body.seat,
        name: body.name ?? body.customerName,
        mobile: body.mobile ?? body.customerMobile,
      };

    const trainNumber = String(
      journey.trainNo ??
        draft.trainNo ??
        body.trainNo ??
        body.TrainNumber ??
        "",
    ).trim();

    const customerMobile = String(
      journey.mobile ??
        draft.mobile ??
        body.mobile ??
        body.CustomerMobile ??
        "",
    ).trim();

    if (!trainNumber || !customerMobile) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_journey",
          debug: {
            hasDraftJourney: !!draft.journey,
            hasBodyJourney: !!body.journey,
            trainNumber,
            customerMobile,
            bodyKeys: Object.keys(body),
            draftKeys: Object.keys(draft || {}),
          },
        },
        { status: 400 },
      );
    }

    const DeliveryDate = (
      journey.deliveryDate ??
      draft.deliveryDate ??
      body.deliveryDate ??
      todayYMD()
    ).slice(0, 10);

    const DeliveryTime = normTimeHHMMSS(
      journey.deliveryTime ??
        draft.deliveryTime ??
        body.deliveryTime,
    );

    const CustomerName =
      (journey.name ??
        draft.name ??
        body.name ??
        body.customerName ??
        "") || null;

    const Coach =
      (journey.coach ??
        draft.coach ??
        body.coach ??
        body.Coach ??
        "") || null;
    const Seat =
      (journey.seat ??
        draft.seat ??
        body.seat ??
        body.Seat ??
        "") || null;

    // ✅ PaymentMode ka bug fix – sirf "ONLINE" hone par hi ONLINE,
    // baaki sab COD (to ensure COD sahi save ho)
    const rawPm = body.paymentMode ?? draft.paymentMode;
    const PaymentMode: "COD" | "ONLINE" =
      rawPm === "ONLINE" ? "ONLINE" : "COD";

    /* ---- 3) Prepare & fetch item metadata from RestroMenuItems ---- */

    const supa = serviceClient;

    const wantedCodes = normItems.map((it) => it.ItemCode);

    let menuMap = new Map<number, RestroMenuItemRow>();
    if (wantedCodes.length) {
      const { data: menuData, error: menuErr } = await supa
        .from<RestroMenuItemRow>("RestroMenuItems")
        .select(
          "id, item_description, item_category, item_cuisine, menu_type, gst_percent, selling_price",
        )
        .eq("restro_code", restroCode)
        .in("id", wantedCodes);

      if (menuErr) {
        console.error("RestroMenuItems fetch error", menuErr);
      } else if (menuData) {
        for (const row of menuData) {
          menuMap.set(row.id, row);
        }
      }
    }

    /* ---- 4) Build rows for Supabase ---- */

    // OrderId: RE-YYYYMMDDHHMMSS-rand
    const stamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);
    const OrderId = `RE-${stamp}-${Math.floor(
      Math.random() * 900 + 100,
    )}`;

    const orderRow = {
      OrderId,
      RestroCode: restroCode,
      RestroName: restroName,
      StationCode: stationCode,
      StationName: stationName,
      DeliveryDate,
      DeliveryTime,
      TrainNumber: trainNumber,
      Coach,
      Seat,
      CustomerName,
      CustomerMobile: customerMobile,
      SubTotal,
      GSTAmount,
      PlatformCharge,
      TotalAmount,
      PaymentMode,
      // ✅ Status ko lowercase "booked" rakha hai
      Status: "booked" as const,
      JourneyPayload: journey,
      // CreatedAt / UpdatedAt DB ke default now() se aa jayega (UTC),
      // admin panel me IST dikhana front-end ka kaam hai.
    };

    const itemRows = normItems.map((it) => {
      const meta = menuMap.get(it.ItemCode);
      return {
        OrderId,
        RestroCode: restroCode,
        ItemCode: it.ItemCode,
        ItemName: it.ItemName,
        ItemDescription: meta?.item_description ?? null,
        ItemCategory: meta?.item_category ?? null,
        Cuisine: meta?.item_cuisine ?? null,
        MenuType: meta?.menu_type ?? null,
        BasePrice: it.BasePrice,
        GSTPercent: meta?.gst_percent ?? it.GSTPercent,
        SellingPrice: meta?.selling_price ?? it.SellingPrice,
        Quantity: it.Quantity,
        LineTotal: it.LineTotal,
      };
    });

    const historyRow = {
      OrderId,
      OldStatus: null,
      NewStatus: "booked",
      Note: "Order created from website",
      ChangedBy: "system",
      // ChangedAt default now() in DB
    };

    /* ---- 5) Insert into Supabase ---- */

    const { error: orderErr } = await supa.from("Orders").insert(orderRow);
    if (orderErr) {
      console.error("Orders insert error", orderErr);
      return NextResponse.json(
        { ok: false, error: "db_orders_error" },
        { status: 500 },
      );
    }

    const { error: itemsErr } = await supa
      .from("OrderItems")
      .insert(itemRows);
    if (itemsErr) {
      console.error("OrderItems insert error", itemsErr);
      // order create ho chuka hai, yahan se fail nahi kar rahe
    }

    const { error: histErr } = await supa
      .from("OrderStatusHistory")
      .insert(historyRow);
    if (histErr) {
      console.error("OrderStatusHistory insert error", histErr);
    }

    return NextResponse.json({ ok: true, orderId: OrderId });
  } catch (err) {
    console.error("orders.POST server_error", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }
}

/** Simple GET – health check */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "orders api alive",
  });
}
