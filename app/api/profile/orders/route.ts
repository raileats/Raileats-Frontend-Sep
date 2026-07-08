import { NextResponse } from "next/server";
import { serviceClient } from "../../../lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type OrderRow = {
  OrderId?: string | null;
  RestroCode?: number | string | null;
  RestroName?: string | null;
  StationCode?: string | null;
  StationName?: string | null;
  DeliveryDate?: string | null;
  DeliveryTime?: string | null;
  TrainNumber?: string | null;
  Coach?: string | null;
  Seat?: string | null;
  CustomerName?: string | null;
  CustomerMobile?: string | null;
  SubTotal?: number | string | null;
  GSTAmount?: number | string | null;
  PlatformCharge?: number | string | null;
  TotalAmount?: number | string | null;
  PaymentMode?: string | null;
  Status?: string | null;
  JourneyPayload?: string | null;
  CreatedAt?: string | null;
  UpdatedAt?: string | null;
  SubStatus?: string | null;
  BookingSource?: string | null;
};

type OrderItemRow = {
  OrderId?: string | null;
  ItemName?: string | null;
  Quantity?: number | string | null;
  LineTotal?: number | string | null;
};

type OrderHistoryRow = {
  OrderId?: string | null;
  OldStatus?: string | null;
  NewStatus?: string | null;
  Note?: string | null;
  ChangedBy?: string | null;
  ChangedAt?: string | null;
  Status?: string | null;
  SubStatus?: string | null;
};

type RestroRow = {
  RestroCode?: number | string | null;
  RestroDisplayPhoto?: string | null;
};

function normalizeMobile(value: string | null) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function normalizeRestroImage(value: unknown) {
  const image = String(value ?? "").trim();

  if (!image) return "/raileats-logo.png";

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  const clean = image.replace(/^\/+/, "");

  return `https://ygisiztmuzwxpnvhwrmr.supabase.co/storage/v1/object/public/RestroDisplayPhoto/${clean}`;
}

function getRestroFileName(restroCode: unknown) {
  const code = String(restroCode ?? "").trim();
  return code ? `${code}.webp` : "";
}

function normalizeStatus(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function parseJourneyPayload(value: unknown) {
  if (!value) return {};

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function getOrderSortTime(order: {
  deliveryDate: string;
  deliveryTime: string;
  bookedAt: string;
}) {
  const deliveryTime = order.deliveryTime || "00:00:00";
  const deliveryDateTime = new Date(
    `${order.deliveryDate || ""}T${deliveryTime}`,
  ).getTime();

  if (Number.isFinite(deliveryDateTime)) return deliveryDateTime;

  const bookedTime = new Date(order.bookedAt || "").getTime();
  return Number.isFinite(bookedTime) ? bookedTime : 0;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mobile = normalizeMobile(url.searchParams.get("mobile"));

    if (!mobile) {
      return NextResponse.json(
        { ok: false, error: "mobile_required", orders: [] },
        { status: 400 },
      );
    }

    const mobileCandidates = [mobile, `91${mobile}`, `+91${mobile}`];

    const { data, error } = await serviceClient
      .from("Orders")
      .select(
        [
          "OrderId",
          "RestroCode",
          "RestroName",
          "StationCode",
          "StationName",
          "DeliveryDate",
          "DeliveryTime",
          "TrainNumber",
          "Coach",
          "Seat",
          "CustomerName",
          "CustomerMobile",
          "SubTotal",
          "GSTAmount",
          "PlatformCharge",
          "TotalAmount",
          "PaymentMode",
          "Status",
          "JourneyPayload",
          "CreatedAt",
          "UpdatedAt",
          "SubStatus",
          "BookingSource",
        ].join(","),
      )
      .in("CustomerMobile", mobileCandidates)
      .order("DeliveryDate", { ascending: false })
      .order("CreatedAt", { ascending: false })
      .limit(100);

    if (error) {
      console.error("PROFILE ORDERS FETCH ERROR:", error);
      return NextResponse.json(
        { ok: false, error: "db_fetch_failed", orders: [] },
        { status: 500 },
      );
    }

    const fetchedOrders = (Array.isArray(data) ? data : []) as OrderRow[];
    const rows = fetchedOrders.filter(
      (order) => normalizeMobile(order.CustomerMobile || "") === mobile,
    );

    const orderIds = rows
      .map((order) => String(order.OrderId || ""))
      .filter(Boolean);

    const restroCodes = Array.from(
      new Set(
        rows
          .map((order) => Number(order.RestroCode))
          .filter((code) => Number.isFinite(code) && code > 0),
      ),
    );

    const imageByRestroCode: Record<string, string> = {};
    const itemsByOrderId: Record<string, OrderItemRow[]> = {};
    const historyByOrderId: Record<string, OrderHistoryRow[]> = {};

    if (restroCodes.length > 0) {
      const { data: restros, error: restroError } = await serviceClient
        .from("RestroMaster")
        .select("RestroCode,RestroDisplayPhoto")
        .in("RestroCode", restroCodes);

      if (restroError) {
        console.error("PROFILE RESTRO IMAGE FETCH ERROR:", restroError);
      }

      ((restros || []) as RestroRow[]).forEach((restro) => {
        const code = String(restro.RestroCode ?? "");
        if (!code) return;

        imageByRestroCode[code] = normalizeRestroImage(
          restro.RestroDisplayPhoto || getRestroFileName(code),
        );
      });
    }

    if (orderIds.length > 0) {
      const { data: items, error: itemsError } = await serviceClient
        .from("OrderItems")
        .select("OrderId,ItemName,Quantity,LineTotal")
        .in("OrderId", orderIds);

      if (itemsError) {
        console.error("PROFILE ORDER ITEMS FETCH ERROR:", itemsError);
      } else {
        ((items || []) as OrderItemRow[]).forEach((item) => {
          const orderId = String(item.OrderId || "");
          if (!orderId) return;

          if (!itemsByOrderId[orderId]) itemsByOrderId[orderId] = [];
          itemsByOrderId[orderId].push(item);
        });
      }

      const { data: history, error: historyError } = await serviceClient
        .from("OrderStatusHistory")
        .select("OrderId,OldStatus,NewStatus,Note,ChangedBy,ChangedAt,Status,SubStatus")
        .in("OrderId", orderIds)
        .order("ChangedAt", { ascending: true });

      if (historyError) {
        console.error("PROFILE ORDER HISTORY FETCH ERROR:", historyError);
      } else {
        ((history || []) as OrderHistoryRow[]).forEach((entry) => {
          const orderId = String(entry.OrderId || "");
          if (!orderId) return;

          if (!historyByOrderId[orderId]) historyByOrderId[orderId] = [];
          historyByOrderId[orderId].push(entry);
        });
      }
    }

    const orders = rows.map((order) => {
      const orderId = order.OrderId || "";
      const restroCode = String(order.RestroCode ?? "");
      const fallbackFile = getRestroFileName(restroCode);
      const journeyPayload = parseJourneyPayload(order.JourneyPayload);
      const history = historyByOrderId[orderId] || [];
      const firstBooked =
        history.find(
          (entry) => normalizeStatus(entry.NewStatus || entry.Status) === "booked",
        ) || history[0];
      const lastHistory = history[history.length - 1];
      const currentStatus =
        order.Status ||
        lastHistory?.NewStatus ||
        lastHistory?.Status ||
        "booked";
      const bookedAt = firstBooked?.ChangedAt || order.CreatedAt || "";
      const currentStageAt = lastHistory?.ChangedAt || order.UpdatedAt || bookedAt;

      return {
        orderId,
        restroCode,
        restroName: order.RestroName || "RailEats Restaurant",
        stationCode: order.StationCode || "",
        stationName: order.StationName || "",
        deliveryDate: order.DeliveryDate || "",
        deliveryTime: order.DeliveryTime || "",
        trainNumber: order.TrainNumber || "",
        coach: order.Coach || "",
        seat: order.Seat || "",
        customerName: order.CustomerName || String(journeyPayload.name || ""),
        customerMobile: order.CustomerMobile || String(journeyPayload.mobile || ""),
        pnr: String(journeyPayload.pnr || ""),
        subTotal: Number(order.SubTotal || 0),
        gstAmount: Number(order.GSTAmount || 0),
        platformCharge: Number(order.PlatformCharge || 0),
        totalAmount: Number(order.TotalAmount || 0),
        paymentMode: order.PaymentMode || "",
        status: currentStatus,
        subStatus: order.SubStatus || lastHistory?.SubStatus || "",
        bookedAt,
        updatedAt: order.UpdatedAt || "",
        currentStageAt,
        bookingSource: order.BookingSource || "",
        imageUrl:
          imageByRestroCode[restroCode] || normalizeRestroImage(fallbackFile),
        items: (itemsByOrderId[orderId] || []).map((item) => ({
          itemName: item.ItemName || "",
          quantity: Number(item.Quantity || 0),
          lineTotal: Number(item.LineTotal || 0),
        })),
        history: history.map((entry) => ({
          oldStatus: entry.OldStatus || "",
          newStatus: entry.NewStatus || entry.Status || "",
          note: entry.Note || "",
          changedBy: entry.ChangedBy || "",
          changedAt: entry.ChangedAt || "",
          subStatus: entry.SubStatus || "",
        })),
      };
    });

    orders.sort((a, b) => getOrderSortTime(b) - getOrderSortTime(a));

    return NextResponse.json({
      ok: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("PROFILE ORDERS API ERROR:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "server_error",
        orders: [],
      },
      { status: 500 },
    );
  }
}
