// app/api/profile/orders/action/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";
import { updateOrderJourneySafe } from "@/lib/orderJourney";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INDIA_OFFSET_MINUTES = 330;
const CANCELLATION_CUTOFF_MINUTES = 90;
const ELIGIBLE_STATUSES = new Set(["booked", "inverification", "neworder"]);
const CANCELLATION_REASONS = new Set([
  "Customer Plan Changed",
  "Train Cancelled",
  "Booked by Mistake",
  "Duplicate Order",
  "Wrong Order Details",
  "Other",
]);

type CancelRequestBody = {
  action?: unknown;
  orderId?: unknown;
  mobile?: unknown;
  reason?: unknown;
  remarks?: unknown;
};

type OrderRow = {
  OrderId: string;
  CustomerMobile: string | null;
  CustomerName: string | null;
  Status: string | null;
  SubStatus: string | null;
  DeliveryDate: string | null;
  DeliveryTime: string | null;
  RestroCode: string | number | null;
  RestroName: string | null;
  StationCode: string | null;
  StationName: string | null;
  UpdatedAt: string | null;
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeMobile(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(-10);
}

function normalizeStatus(value: unknown) {
  return cleanText(value).toLowerCase().replace(/\s+/g, "");
}

function parseIndiaDeliveryDateTime(
  deliveryDate: unknown,
  deliveryTime: unknown,
) {
  const dateMatch = cleanText(deliveryDate).match(
    /^(\d{4})-(\d{2})-(\d{2})/,
  );
  const timeMatch = cleanText(deliveryTime || "00:00").match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );

  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] || 0);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  const validationDate = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second),
  );
  if (
    validationDate.getUTCFullYear() !== year ||
    validationDate.getUTCMonth() !== month - 1 ||
    validationDate.getUTCDate() !== day
  ) {
    return null;
  }

  return new Date(
    Date.UTC(year, month - 1, day, hour, minute, second) -
      INDIA_OFFSET_MINUTES * 60_000,
  );
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | CancelRequestBody
      | null;
    const action = cleanText(body?.action);
    const orderId = cleanText(body?.orderId);
    const mobile = normalizeMobile(body?.mobile);
    const reason = cleanText(body?.reason);
    const remarks = cleanText(body?.remarks);

    if (action !== "cancel_request") {
      return errorResponse("invalid_action", 400);
    }
    if (!orderId) {
      return errorResponse("order_id_required", 400);
    }
    if (!/^\d{10}$/.test(mobile)) {
      return errorResponse("valid_mobile_required", 400);
    }
    if (!reason) {
      return errorResponse("reason_required", 400);
    }
    if (!CANCELLATION_REASONS.has(reason)) {
      return errorResponse("invalid_reason", 400);
    }
    if (reason === "Other" && !remarks) {
      return errorResponse("remarks_required", 400);
    }

    const { data, error } = await serviceClient
      .from("Orders")
      .select(
        [
          "OrderId",
          "CustomerMobile",
          "CustomerName",
          "Status",
          "SubStatus",
          "DeliveryDate",
          "DeliveryTime",
          "RestroCode",
          "RestroName",
          "StationCode",
          "StationName",
          "UpdatedAt",
        ].join(","),
      )
      .eq("OrderId", orderId)
      .maybeSingle();

    if (error) {
      console.error("CUSTOMER CANCEL ORDER FETCH ERROR:", error);
      return errorResponse("order_fetch_failed", 500);
    }
    if (!data) {
      return errorResponse("order_not_found", 404);
    }

    const order = data as unknown as OrderRow;
    if (normalizeMobile(order.CustomerMobile) !== mobile) {
      return errorResponse("customer_mismatch", 403);
    }

    const normalizedStatus = normalizeStatus(order.Status);
    if (normalizedStatus === "cancellationrequest") {
      return errorResponse("cancellation_already_requested", 409);
    }
    if (!ELIGIBLE_STATUSES.has(normalizedStatus)) {
      return errorResponse("status_not_eligible", 409);
    }

    const deliveryDateTime = parseIndiaDeliveryDateTime(
      order.DeliveryDate,
      order.DeliveryTime,
    );
    if (!deliveryDateTime) {
      return errorResponse("invalid_delivery_datetime", 409);
    }

    const cutoff =
      deliveryDateTime.getTime() - CANCELLATION_CUTOFF_MINUTES * 60_000;
    if (Date.now() > cutoff) {
      return errorResponse("cancellation_window_closed", 409);
    }

    const updatedAt = new Date().toISOString();
    const { data: updatedRows, error: updateError } = await serviceClient
      .from("Orders")
      .update({
        Status: "Cancellation Request",
        SubStatus: reason,
        UpdatedAt: updatedAt,
      })
      .eq("OrderId", orderId)
      .eq("Status", order.Status)
      .select("OrderId,Status,SubStatus,UpdatedAt");

    if (updateError) {
      console.error("CUSTOMER CANCEL ORDER UPDATE ERROR:", updateError);
      return errorResponse("cancellation_request_failed", 500);
    }

    if (!Array.isArray(updatedRows) || updatedRows.length !== 1) {
      const { data: latestData, error: latestError } = await serviceClient
        .from("Orders")
        .select("Status")
        .eq("OrderId", orderId)
        .maybeSingle();

      if (latestError) {
        console.error("CUSTOMER CANCEL ORDER RECHECK ERROR:", latestError);
        return errorResponse("cancellation_request_failed", 500);
      }
      const latestOrder = latestData as unknown as {
        Status?: string | null;
      } | null;
      if (normalizeStatus(latestOrder?.Status) === "cancellationrequest") {
        return errorResponse("cancellation_already_requested", 409);
      }
      return errorResponse("status_not_eligible", 409);
    }
await updateOrderJourneySafe({
  supabase: serviceClient,
  orderId,
  stage: "Cancellation Request",
  status: "Cancellation Request",
  subStatus: reason,
  remarks: remarks || reason,
  userType: "Customer",
  userName: cleanText(order.CustomerName) || mobile,
  source: "Customer Profile",
  actionAt: updatedAt,
  order: {
    restroCode: order.RestroCode,
    restroName: order.RestroName,
    stationCode: order.StationCode,
    stationName: order.StationName,
    deliveryDate: order.DeliveryDate,
    deliveryTime: order.DeliveryTime,
  },
});

    return NextResponse.json({
      ok: true,
      order: {
        orderId,
        status: "Cancellation Request",
        subStatus: reason,
        updatedAt,
      },
    });
  } catch (error) {
    console.error("CUSTOMER CANCEL ORDER API ERROR:", error);
    return errorResponse("server_error", 500);
  }
}
