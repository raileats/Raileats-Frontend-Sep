// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

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
    (isAndroid && (/; wv\)/i.test(ua) || /Version\/4\.0/i.test(ua)));

  if (isAndroidApp) return "App";
  if (isAndroid) return "Mobile Web";
  if (isIos) return "IOS";
  if (isMac && !isMobile) return "Mac";
  if (isWindows) return "Desktop";

  return isMobile ? "Mobile Web" : "Desktop";
}

function cleanOptionalOrderFields(row: Record<string, any>) {
  const next = { ...row };
  delete next.BookingSource;
  delete next.BookedBy;
  delete next.IsAgentOrder;
  delete next.PNR;
  return next;
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

    const stationName =
      String(stationNameRaw || "").trim() || stationCode;

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

    const rawPm = body.paymentMode ?? draft.paymentMode;
    const PaymentMode: "COD" | "ONLINE" =
      rawPm === "ONLINE" ? "ONLINE" : "COD";

    const bookingSource = detectBookingSource(
      req,
      body.BookingSource ||
        body.bookingSource ||
        draft.BookingSource ||
        draft.bookingSource ||
        (journey as any).BookingSource ||
        (journey as any).bookingSource,
    );
    const isAgentOrder = !!(
      body.IsAgentOrder ||
      body.isAgentOrder ||
      draft.IsAgentOrder ||
      draft.isAgentOrder ||
      (journey as any).IsAgentOrder ||
      (journey as any).isAgentOrder
    );
    const bookedBy =
      body.BookedBy ||
      body.bookedBy ||
      draft.BookedBy ||
      draft.bookedBy ||
      (journey as any).BookedBy ||
      (journey as any).bookedBy ||
      (isAgentOrder
        ? `${CustomerName || customerMobile || "Customer"} Agent`
        : CustomerName || "Customer");

    /* ---- 3) Fetch RestroMenuItems meta ---- */

    const supa = serviceClient;
    const wantedCodes = normItems.map((it) => it.ItemCode);

    const menuMap = new Map<number, RestroMenuItemRow>();
    if (wantedCodes.length) {
      const { data: menuData, error: menuErr } = await supa
        .from("RestroMenuItems")
        .select(
          "id, item_description, item_category, item_cuisine, menu_type, gst_percent, selling_price",
        )
        .eq("restro_code", restroCode)
        .in("id", wantedCodes);

      if (menuErr) {
        console.error("RestroMenuItems fetch error", menuErr);
      } else if (menuData) {
        for (const row of menuData as RestroMenuItemRow[]) {
          menuMap.set(row.id, row);
        }
      }
    }

    /* ---- 4) Build rows ---- */

    const stamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);
    const OrderId = `RE-${stamp}-${Math.floor(
      Math.random() * 900 + 100,
    )}`;

    const orderRow: Record<string, any> = {
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
      PNR:
        journey.pnr ??
        draft.pnr ??
        body.pnr ??
        body.PNR ??
        null,
      CustomerName,
      CustomerMobile: customerMobile,
      SubTotal,
      GSTAmount,
      PlatformCharge,
      TotalAmount,
      PaymentMode,
      Status: "booked" as const,
      BookingSource: bookingSource,
      BookedBy: bookedBy,
      IsAgentOrder: isAgentOrder,
      JourneyPayload: {
        ...journey,
        BookingSource: bookingSource,
        BookedBy: bookedBy,
        IsAgentOrder: isAgentOrder,
      },
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
    };

    /* ---- 5) Insert into Supabase ---- */

    let orderInsert = await supa.from("Orders").insert(orderRow);

    if (orderInsert.error) {
      const message = orderInsert.error.message || "";
      const shouldRetryWithoutOptionalColumns =
        /BookingSource|BookedBy|IsAgentOrder|PNR|column|schema cache/i.test(message);

      if (shouldRetryWithoutOptionalColumns) {
        orderInsert = await supa
          .from("Orders")
          .insert(cleanOptionalOrderFields(orderRow));
      }
    }

    if (orderInsert.error) {
      console.error("Orders insert error", orderInsert.error);
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
