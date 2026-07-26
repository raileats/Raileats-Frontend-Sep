import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CANCEL_REASONS = new Set([
  "Customer Plan Changed",
  "Train Cancelled",
  "Booked by Mistake",
  "Duplicate Order",
  "Wrong Order Details",
  "Other",
]);

const ISSUE_REASONS = new Set([
  "Food Not Received",
  "Cancelled due to Train Late",
  "Quality Issue",
  "Quantity Issue",
  "Partial Delivered",
  "Wrong Item Delivered",
  "Food Was Cold",
  "Packaging Issue",
  "Other",
]);

type RequestBody = {
  action?: unknown;
  orderId?: unknown;
  mobile?: unknown;
  reason?: unknown;
  issueType?: unknown;
  remarks?: unknown;
  rating?: unknown;
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
};

type CustomerActionOrder = {
  deliveryDate: string;
  deliveryTime: string;
  status: string;
  customerResponse?: unknown;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeMobile(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(-10);
}

function normalizeOrderStatus(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function parseIndiaDeliveryDateTime(
  deliveryDate: unknown,
  deliveryTime: unknown,
) {
  const rawDate = text(deliveryDate);
  const isoDate = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const localDate = rawDate.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  const date = isoDate
    ? {
        year: Number(isoDate[1]),
        month: Number(isoDate[2]),
        day: Number(isoDate[3]),
      }
    : localDate
      ? {
          year: Number(localDate[3]),
          month: Number(localDate[2]),
          day: Number(localDate[1]),
        }
      : null;
  const timeMatch = text(deliveryTime || "00:00")
    .toUpperCase()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/);
  if (!date || !timeMatch) return null;

  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] || 0);
  const meridiem = timeMatch[4] || "";
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (hour === 12) hour = 0;
    if (meridiem === "PM") hour += 12;
  }
  if (
    date.month < 1 ||
    date.month > 12 ||
    date.day < 1 ||
    date.day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  const validation = new Date(
    Date.UTC(date.year, date.month - 1, date.day, hour, minute, second),
  );
  if (
    validation.getUTCFullYear() !== date.year ||
    validation.getUTCMonth() !== date.month - 1 ||
    validation.getUTCDate() !== date.day
  ) {
    return null;
  }
  return new Date(validation.getTime() - 330 * 60_000);
}

function canCustomerCancel(order: CustomerActionOrder, nowMs = Date.now()) {
  if (
    !["booked", "verification", "inverification", "neworder"].includes(
      normalizeOrderStatus(order.status),
    )
  ) {
    return false;
  }
  const delivery = parseIndiaDeliveryDateTime(
    order.deliveryDate,
    order.deliveryTime,
  );
  return Boolean(delivery && nowMs <= delivery.getTime() - 90 * 60_000);
}

function canSubmitCustomerDeliveryResponse(
  order: CustomerActionOrder,
  nowMs = Date.now(),
) {
  if (
    order.customerResponse ||
    ["cancelled", "cancellationrequest", "notdelivered"].includes(
      normalizeOrderStatus(order.status),
    )
  ) {
    return false;
  }
  const delivery = parseIndiaDeliveryDateTime(
    order.deliveryDate,
    order.deliveryTime,
  );
  return Boolean(delivery && nowMs >= delivery.getTime() + 30 * 60_000);
}

type DatabaseError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function jsonError(
  error: string,
  status: number,
  metadata: Record<string, unknown> = {},
) {
  return NextResponse.json({ ok: false, error, ...metadata }, { status });
}

function databaseErrorResponse(
  operation: string,
  error: DatabaseError,
  fallback = "supabase_insert_failed",
) {
  const message = error.message || "Unknown Supabase error";
  const missingTable =
    message.match(/relation ["']?([^"']+)["']? does not exist/i)?.[1] ||
    message.match(/table ["']?([^"']+)["']?/i)?.[1] ||
    (error.code === "42P01" || error.code === "PGRST205"
      ? "OrderCustomerResponse"
      : "");
  const missingColumn =
    message.match(/column ["']?([^"']+)["']?.*does not exist/i)?.[1] ||
    message.match(/Could not find the ['"]([^'"]+)['"] column/i)?.[1] ||
    "";

  console.error(`[profile-order-action] ${operation}`, {
    code: error.code || null,
    message,
    details: error.details || null,
    hint: error.hint || null,
  });

  if (missingTable) {
    return jsonError("table_missing", 503, {
      table: missingTable,
      databaseCode: error.code || null,
      databaseMessage: message,
    });
  }
  if (missingColumn || error.code === "42703" || error.code === "PGRST204") {
    return jsonError("column_missing", 500, {
      column: missingColumn || "unknown",
      databaseCode: error.code || null,
      databaseMessage: message,
    });
  }
  if (error.code === "42501") {
    return jsonError("permission_denied", 403, {
      databaseCode: error.code,
      databaseMessage: message,
    });
  }
  if (error.code === "23505") {
    return jsonError("duplicate_response", 409, {
      databaseCode: error.code,
      databaseMessage: message,
    });
  }
  return jsonError(fallback, 500, {
    operation,
    databaseCode: error.code || null,
    databaseMessage: message,
    databaseDetails: error.details || null,
    databaseHint: error.hint || null,
  });
}

async function loadOwnedOrder(orderId: string, mobile: string) {
  const { data, error } = await serviceClient
    .from("Orders")
    .select(
      "OrderId,CustomerMobile,CustomerName,Status,SubStatus,DeliveryDate,DeliveryTime,RestroCode,RestroName,StationCode,StationName",
    )
    .eq("OrderId", orderId)
    .maybeSingle();

  console.info("[profile-order-action] order lookup", {
    orderId,
    found: Boolean(data),
    errorCode: error?.code || null,
  });
  if (error) {
    return {
      error: databaseErrorResponse("order_lookup", error, "order_fetch_failed"),
    };
  }
  if (!data) return { error: jsonError("order_not_found", 404) };

  const order = data as unknown as OrderRow;
  if (normalizeMobile(order.CustomerMobile) !== mobile) {
    console.warn("[profile-order-action] customer validation failed", {
      orderId,
      submittedMobileLast4: mobile.slice(-4),
      orderMobileLast4: normalizeMobile(order.CustomerMobile).slice(-4),
    });
    return { error: jsonError("customer_mismatch", 403) };
  }
  console.info("[profile-order-action] customer validation passed", {
    orderId,
    mobileLast4: mobile.slice(-4),
  });
  return { order };
}

async function assertNoCustomerResponse(orderId: string) {
  const { data, error } = await serviceClient
    .from("OrderCustomerResponse")
    .select("OrderId")
    .eq("OrderId", orderId)
    .maybeSingle();

  console.info("[profile-order-action] response lookup", {
    orderId,
    found: Boolean(data),
    errorCode: error?.code || null,
  });
  if (error) {
    return databaseErrorResponse(
      "customer_response_lookup",
      error,
      "customer_response_check_failed",
    );
  }
  if (data) return jsonError("duplicate_response", 409);
  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as RequestBody | null;
    const action = text(body?.action);
    const orderId = text(body?.orderId);
    const mobile = normalizeMobile(body?.mobile);

    console.info("[profile-order-action] request", {
      body: {
        action: body?.action ?? null,
        orderId: body?.orderId ?? null,
        mobileLast4: mobile.slice(-4),
        reason: body?.reason ?? null,
        issueType: body?.issueType ?? null,
        rating: body?.rating ?? null,
        remarksProvided: Boolean(text(body?.remarks)),
      },
      parsedAction: action,
    });

    if (!orderId) return jsonError("order_id_required", 400);
    if (!/^\d{10}$/.test(mobile)) {
      return jsonError("valid_mobile_required", 400);
    }

    const loaded = await loadOwnedOrder(orderId, mobile);
    if (loaded.error) return loaded.error;
    const order = loaded.order!;
    const now = new Date();

    switch (action) {
      case "cancel_request": {
        const reason = text(body?.reason);
        const remarks = text(body?.remarks);
        if (!CANCEL_REASONS.has(reason)) {
          return jsonError(reason ? "invalid_reason" : "reason_required", 400);
        }
        if (reason === "Other" && !remarks) {
          return jsonError("remarks_required", 400);
        }

        const status = normalizeOrderStatus(order.Status);
        if (status === "cancellationrequest") {
          return jsonError("cancellation_already_requested", 409);
        }
        if (
          !["booked", "verification", "inverification", "neworder"].includes(
            status,
          )
        ) {
          return jsonError("status_not_eligible", 409);
        }
        if (
          !parseIndiaDeliveryDateTime(order.DeliveryDate, order.DeliveryTime)
        ) {
          console.warn("[profile-order-action] delivery validation failed", {
            orderId,
            deliveryDate: order.DeliveryDate,
            deliveryTime: order.DeliveryTime,
          });
          return jsonError("invalid_delivery_datetime", 409);
        }
        if (
          !canCustomerCancel(
            {
              deliveryDate: order.DeliveryDate || "",
              deliveryTime: order.DeliveryTime || "",
              status: order.Status || "",
            },
            now.getTime(),
          )
        ) {
          return jsonError("cancellation_window_closed", 409);
        }

        const updatedAt = now.toISOString();
        const { data: updated, error: updateError } = await serviceClient
          .from("Orders")
          .update({
            Status: "Cancellation Request",
            SubStatus: reason,
            UpdatedAt: updatedAt,
          })
          .eq("OrderId", orderId)
          .eq("Status", order.Status)
          .eq("CustomerMobile", order.CustomerMobile)
          .select("OrderId");

        if (updateError) {
          return databaseErrorResponse(
            "cancellation_order_update",
            updateError,
            "supabase_update_failed",
          );
        }
        if (!Array.isArray(updated) || updated.length !== 1) {
          const { data: latest } = await serviceClient
            .from("Orders")
            .select("Status")
            .eq("OrderId", orderId)
            .maybeSingle();
          const latestOrder = latest as unknown as {
            Status?: string | null;
          } | null;
          if (
            normalizeOrderStatus(latestOrder?.Status) ===
            "cancellationrequest"
          ) {
            return jsonError("cancellation_already_requested", 409);
          }
          return jsonError("status_not_eligible", 409);
        }

        return NextResponse.json({
          ok: true,
          message: "Cancellation request submitted successfully.",
          order: {
            orderId,
            status: "Cancellation Request",
            subStatus: reason,
            updatedAt,
          },
        });
      }

      case "customer_delivered":
      case "customer_issue": {
        if (
          !parseIndiaDeliveryDateTime(order.DeliveryDate, order.DeliveryTime)
        ) {
          console.warn("[profile-order-action] delivery validation failed", {
            orderId,
            deliveryDate: order.DeliveryDate,
            deliveryTime: order.DeliveryTime,
          });
          return jsonError("invalid_delivery_datetime", 409);
        }
        if (
          !canSubmitCustomerDeliveryResponse(
            {
              deliveryDate: order.DeliveryDate || "",
              deliveryTime: order.DeliveryTime || "",
              status: order.Status || "",
            },
            now.getTime(),
          )
        ) {
          console.warn(
            "[profile-order-action] delivery confirmation unavailable",
            {
              orderId,
              status: order.Status,
              deliveryDate: order.DeliveryDate,
              deliveryTime: order.DeliveryTime,
              now: now.toISOString(),
            },
          );
          return jsonError("delivery_confirmation_not_available", 409);
        }
        console.info("[profile-order-action] delivery validation passed", {
          orderId,
          action,
          now: now.toISOString(),
        });

        const duplicateError = await assertNoCustomerResponse(orderId);
        if (duplicateError) return duplicateError;

        const remarks = text(body?.remarks);
        const issueType =
          action === "customer_issue"
            ? text(body?.issueType || body?.reason)
            : "";
        if (action === "customer_issue" && !ISSUE_REASONS.has(issueType)) {
          return jsonError("invalid_issue_reason", 400);
        }
        if (action === "customer_issue" && issueType === "Other" && !remarks) {
          return jsonError("remarks_required", 400);
        }

        let rating: number | null = null;
        if (action === "customer_delivered" && text(body?.rating)) {
          rating = Number(body?.rating);
          if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return jsonError("invalid_rating", 400);
          }
        }

        const timestamp = now.toISOString();
        const responsePayload = {
          OrderId: orderId,
          CustomerMobile: order.CustomerMobile,
          CustomerAction:
            action === "customer_delivered" ? "Delivered" : "Issue",
          IssueType: action === "customer_issue" ? issueType : null,
          Rating: rating,
          Remarks: remarks || null,
          CreatedAt: timestamp,
          UpdatedAt: timestamp,
        };
        const { data: customerResponse, error: insertError } =
          await serviceClient
            .from("OrderCustomerResponse")
            .insert(responsePayload)
            .select(
              "CustomerAction,IssueType,Rating,Remarks,CreatedAt",
            )
            .maybeSingle();

        if (insertError) {
          return databaseErrorResponse(
            "customer_response_insert",
            insertError,
          );
        }
        if (!customerResponse) {
          console.error(
            "[profile-order-action] customer response insert returned no row",
            { orderId, action },
          );
          return jsonError("supabase_insert_failed", 500, {
            operation: "customer_response_insert",
            databaseMessage: "Insert completed without returning a row",
          });
        }

        if (action === "customer_issue") {
          const { data: pending, error: pendingError } = await serviceClient
            .from("OrderComplaints")
            .select("ComplaintId")
            .eq("OrderId", orderId)
            .eq("ComplaintStatus", "Pending")
            .limit(1);

          if (pendingError) {
            await serviceClient
              .from("OrderCustomerResponse")
              .delete()
              .eq("OrderId", orderId);
            return databaseErrorResponse(
              "pending_complaint_lookup",
              pendingError,
              "complaint_lookup_failed",
            );
          }

          if (!Array.isArray(pending) || pending.length === 0) {
            const { error: complaintError } = await serviceClient
              .from("OrderComplaints")
              .insert({
                OrderId: orderId,
                RestroCode: order.RestroCode,
                RestroName: order.RestroName,
                CustomerName: order.CustomerName,
                CustomerMobile: order.CustomerMobile,
                RaisedByType: "Customer",
                RaisedByName: text(order.CustomerName) || mobile,
                RaisedByMobile: order.CustomerMobile,
                PreviousStatus: order.Status || "Booked",
                PreviousSubStatus: order.SubStatus,
                RequestedStatus: "Bad Delivery",
                RequestedSubStatus: issueType,
                ComplaintRemarks: remarks || issueType,
                ComplaintStatus: "Pending",
              });

            if (complaintError) {
              await serviceClient
                .from("OrderCustomerResponse")
                .delete()
                .eq("OrderId", orderId);
              return databaseErrorResponse(
                "customer_complaint_insert",
                complaintError,
                "complaint_create_failed",
              );
            }
          }
        }

        const saved = customerResponse as unknown as {
          CustomerAction?: string | null;
          IssueType?: string | null;
          Rating?: number | null;
          Remarks?: string | null;
          CreatedAt?: string | null;
        };
        return NextResponse.json({
          ok: true,
          message:
            action === "customer_delivered"
              ? "Delivery confirmed successfully."
              : "Issue reported successfully.",
          customerResponse: {
            action: saved.CustomerAction,
            issueType: saved.IssueType || "",
            rating: saved.Rating ?? null,
            remarks: saved.Remarks || "",
            createdAt: saved.CreatedAt || timestamp,
          },
        });
      }

      default:
        return jsonError("invalid_action", 400);
    }
  } catch (error) {
    console.error("PROFILE ORDER ACTION ERROR:", error);
    return jsonError("server_error", 500);
  }
}
