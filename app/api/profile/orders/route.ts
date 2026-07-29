// app/api/profile/orders/route.ts
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
  PNR?: string | null;
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

type OrderJourneyRow = {
  OrderId?: string | null;
  Status?: string | null;
  SubStatus?: string | null;
  Remarks?: string | null;
  CreatedAt?: string | null;
  UpdatedAt?: string | null;
  [key: string]: unknown;
};

type CustomerResponseRow = {
  OrderId?: string | null;
  CustomerAction?: "Delivered" | "Issue" | null;
  IssueType?: string | null;
  Rating?: number | string | null;
  Remarks?: string | null;
  CreatedAt?: string | null;
};

type RestroRow = {
  RestroCode?: number | string | null;
  RestroDisplayPhoto?: string | null;
};

const ORDER_JOURNEY_STAGES = [
  { status: "Booked", prefix: "Booked" },
  { status: "In Verification", prefix: "InVerification" },
  { status: "Cancellation Request", prefix: "CancellationRequest" },
  { status: "New Order", prefix: "NewOrder" },
  { status: "In Kitchen", prefix: "InKitchen" },
  { status: "Out for Delivery", prefix: "OutForDelivery" },
  { status: "Restro Marked Delivered", prefix: "RestroMarkedDelivered" },
  { status: "Complaints", prefix: "Complaints" },
  { status: "Delivered", prefix: "Delivered" },
  { status: "Cancelled", prefix: "Cancelled" },
  { status: "Not Delivered", prefix: "NotDelivered" },
  { status: "Bad Delivery", prefix: "BadDelivery" },
  { status: "Partial Delivery", prefix: "PartialDelivery" },
  { status: "Refund", prefix: "Refund" },
  { status: "Refund Requested", prefix: "RefundRequested" },
  { status: "Refund Under Review", prefix: "RefundUnderReview" },
  { status: "Refund Approved", prefix: "RefundApproved" },
  { status: "Refund Processing", prefix: "RefundProcessing" },
  { status: "Refund Completed", prefix: "RefundCompleted" },
] as const;

function normalizeMobile(value: string | null) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeRestroImage(value: unknown) {
  const image = String(value ?? "").trim();
  if (!image) return "/raileats-logo.png";
  if (image.startsWith("http://") || image.startsWith("https://")) return image;

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

function combineJourneyDateTime(dateValue: unknown, timeValue: unknown) {
  const date = cleanText(dateValue);
  const time = cleanText(timeValue);
  if (!date) return "";

  const dateMatch = date.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) return "";

  const timeMatch = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const hour = timeMatch ? timeMatch[1].padStart(2, "0") : "00";
  const minute = timeMatch?.[2] || "00";
  const second = timeMatch?.[3] || "00";

  return `${dateMatch[1]}T${hour}:${minute}:${second}+05:30`;
}

function journeyRowToHistory(row: OrderJourneyRow): OrderHistoryRow[] {
  const currentStatus = normalizeStatus(row.Status);
  const events = ORDER_JOURNEY_STAGES.flatMap((stage, sequence) => {
    const update = cleanText(row[`${stage.prefix}Update`]);
    const remarks = cleanText(row[`${stage.prefix}Remarks`]);
    const userType = cleanText(row[`${stage.prefix}UserType`]);
    const userName = cleanText(row[`${stage.prefix}UserName`]);
    const source = cleanText(row[`${stage.prefix}Source`]);
    const actionDate = cleanText(row[`${stage.prefix}ActionAtDate`]);
    const actionTime = cleanText(row[`${stage.prefix}ActionAtTime`]);

    if (
      !update &&
      !remarks &&
      !userType &&
      !userName &&
      !source &&
      !actionDate &&
      !actionTime
    ) {
      return [];
    }

    const changedAt = combineJourneyDateTime(actionDate, actionTime);
    const subStatus =
      normalizeStatus(stage.status) === currentStatus
        ? cleanText(row.SubStatus)
        : "";

    return [
      {
        sequence,
        entry: {
          OrderId: cleanText(row.OrderId),
          OldStatus: "",
          NewStatus: stage.status,
          Note: remarks,
          ChangedBy: userName || userType || source,
          ChangedAt: changedAt,
          Status: stage.status,
          SubStatus: subStatus,
        } satisfies OrderHistoryRow,
      },
    ];
  });

  if (events.length === 0 && cleanText(row.Status)) {
    events.push({
      sequence: ORDER_JOURNEY_STAGES.length,
      entry: {
        OrderId: cleanText(row.OrderId),
        OldStatus: "",
        NewStatus: cleanText(row.Status),
        Note: cleanText(row.Remarks),
        ChangedBy: "",
        ChangedAt: cleanText(row.UpdatedAt || row.CreatedAt),
        Status: cleanText(row.Status),
        SubStatus: cleanText(row.SubStatus),
      },
    });
  }

  events.sort((left, right) => {
    const leftTime = Date.parse(left.entry.ChangedAt || "");
    const rightTime = Date.parse(right.entry.ChangedAt || "");

    if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
      return leftTime - rightTime || left.sequence - right.sequence;
    }
    if (Number.isFinite(leftTime)) return -1;
    if (Number.isFinite(rightTime)) return 1;
    return left.sequence - right.sequence;
  });

  return events.map(({ entry }, index) => ({
    ...entry,
    OldStatus: index > 0 ? events[index - 1].entry.NewStatus || "" : "",
  }));
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
          "PNR",
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
    const customerResponseByOrderId: Record<string, CustomerResponseRow> = {};

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

      const { data: journeys, error: journeyError } = await serviceClient
        .from("OrderJourney")
        .select("*")
        .in("OrderId", orderIds);

      if (journeyError) {
        console.error("PROFILE ORDER JOURNEY FETCH ERROR:", journeyError);
        return NextResponse.json(
          { ok: false, error: "order_journey_fetch_failed", orders: [] },
          { status: 500 },
        );
      }

      ((journeys || []) as OrderJourneyRow[]).forEach((journey) => {
        const orderId = cleanText(journey.OrderId);
        if (!orderId) return;
        historyByOrderId[orderId] = journeyRowToHistory(journey);
      });

      const { data: responses, error: responsesError } = await serviceClient
        .from("OrderCustomerResponse")
        .select("OrderId,CustomerAction,IssueType,Rating,Remarks,CreatedAt")
        .in("OrderId", orderIds)
        .order("CreatedAt", { ascending: false });

      if (responsesError) {
        console.error(
          "PROFILE CUSTOMER RESPONSE FETCH ERROR:",
          responsesError,
        );
        return NextResponse.json(
          { ok: false, error: "customer_response_fetch_failed", orders: [] },
          { status: 500 },
        );
      }

      ((responses || []) as CustomerResponseRow[]).forEach((response) => {
        const orderId = cleanText(response.OrderId);
        if (orderId && !customerResponseByOrderId[orderId]) {
          customerResponseByOrderId[orderId] = response;
        }
      });
    }

    const orders = rows.map((order) => {
      const orderId = order.OrderId || "";
      const restroCode = String(order.RestroCode ?? "");
      const fallbackFile = getRestroFileName(restroCode);
      const journeyPayload = parseJourneyPayload(order.JourneyPayload);
      const journeyHistory = historyByOrderId[orderId] || [];
      const history = journeyHistory.some(
        (entry) => normalizeStatus(entry.NewStatus) === "booked",
      )
        ? journeyHistory
        : [
            {
              OrderId: orderId,
              OldStatus: "",
              NewStatus: "Booked",
              Note: "Order created",
              ChangedBy: "",
              ChangedAt: order.CreatedAt || "",
              Status: "Booked",
              SubStatus: "",
            },
            ...journeyHistory,
          ];
      const firstBooked =
        history.find(
          (entry) =>
            normalizeStatus(entry.NewStatus || entry.Status) === "booked",
        ) || history[0];
      const lastHistory = history[history.length - 1];
      const currentStatus =
        order.Status ||
        lastHistory?.NewStatus ||
        lastHistory?.Status ||
        "booked";
      const bookedAt = firstBooked?.ChangedAt || order.CreatedAt || "";
      const currentStatusHistory = [...history]
        .reverse()
        .find(
          (entry) =>
            normalizeStatus(entry.NewStatus || entry.Status) ===
            normalizeStatus(currentStatus),
        );
      const currentStageAt =
        currentStatusHistory?.ChangedAt ||
        order.UpdatedAt ||
        lastHistory?.ChangedAt ||
        bookedAt;
      const customerResponse = customerResponseByOrderId[orderId];

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
        customerMobile:
          order.CustomerMobile || String(journeyPayload.mobile || ""),
        pnr: String(order.PNR || journeyPayload.pnr || ""),
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
        customerResponse: customerResponse
          ? {
              action: customerResponse.CustomerAction,
              issueType: customerResponse.IssueType || "",
              rating:
                customerResponse.Rating === null ||
                customerResponse.Rating === undefined
                  ? null
                  : Number(customerResponse.Rating),
              remarks: customerResponse.Remarks || "",
              createdAt: customerResponse.CreatedAt || "",
            }
          : null,
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
