"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CustomerResponse = {
  action: "Delivered" | "Issue";
  issueType: string;
  rating: number | null;
  remarks: string;
  createdAt: string;
};

type CustomerActionOrder = {
  deliveryDate: string;
  deliveryTime: string;
  status: string;
  customerResponse?: CustomerResponse | null;
};

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
  const rawDate = String(deliveryDate ?? "").trim();
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
  const timeMatch = String(deliveryTime ?? "00:00")
    .trim()
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
    ["delivered", "cancelled", "cancellationrequest", "notdelivered"].includes(
      normalizeOrderStatus(order.status),
    )
  ) {
    return false;
  }
  const delivery = parseIndiaDeliveryDateTime(
    order.deliveryDate,
    order.deliveryTime,
  );
  return Boolean(
    delivery &&
      nowMs >= delivery.getTime() + 30 * 60_000 &&
      nowMs < delivery.getTime() + 72 * 60 * 60_000,
  );
}

type OrderItem = {
  itemName: string;
  quantity: number;
  lineTotal: number;
};

type CustomerOrder = {
  orderId: string;
  restroName: string;
  stationCode: string;
  stationName: string;
  deliveryDate: string;
  deliveryTime: string;
  trainNumber: string;
  coach: string;
  seat: string;
  customerMobile: string;
  totalAmount: number;
  paymentMode: string;
  status: string;
  subStatus?: string;
  bookedAt: string;
  currentStageAt?: string;
  updatedAt?: string;
  imageUrl: string;
  items?: OrderItem[];
  customerResponse?: CustomerResponse | null;
};

type OrdersResponse = {
  ok: boolean;
  orders?: CustomerOrder[];
  error?: string;
};

type CancelResponse = {
  ok: boolean;
  order?: {
    orderId: string;
    status: string;
    subStatus: string;
    updatedAt: string;
  };
  customerResponse?: CustomerResponse;
  error?: string;
  databaseMessage?: string;
  table?: string;
  column?: string;
};

const CANCEL_REASONS = [
  "Customer Plan Changed",
  "Train Cancelled",
  "Booked by Mistake",
  "Duplicate Order",
  "Wrong Order Details",
  "Other",
] as const;

const ISSUE_REASONS = [
  "Food Not Received",
  "Cancelled due to Train Late",
  "Quality Issue",
  "Quantity Issue",
  "Partial Delivered",
  "Wrong Item Delivered",
  "Food Was Cold",
  "Packaging Issue",
  "Other",
] as const;

function normalizeMobile(value: string) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function isCancellationRequested(order: CustomerOrder) {
  return normalizeOrderStatus(order.status) === "cancellationrequest";
}

function titleCase(value: string) {
  return String(value || "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shortText(value: string, limit = 30) {
  const text = String(value || "").trim();
  return text.length <= limit ? text : `${text.slice(0, limit)}...`;
}

function formatDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDeliveryDate(dateValue: string, timeValue: string) {
  const date = parseIndiaDeliveryDateTime(dateValue, timeValue);
  if (!date) return [dateValue, timeValue].filter(Boolean).join(" ");

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stationText(order: CustomerOrder) {
  if (order.stationCode && order.stationName) {
    return `${order.stationCode} - ${order.stationName}`;
  }
  return order.stationCode || order.stationName || "Station";
}

function getItemSummary(items?: OrderItem[]) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return "";

  const first = list[0];
  const firstText =
    first.quantity > 0 ? `${first.quantity}x ${first.itemName}` : first.itemName;
  const extraCount = list.length - 1;
  return shortText(
    extraCount > 0 ? `${firstText} +${extraCount} more` : firstText,
    30,
  );
}

export default function MyOrdersPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [cancelOrder, setCancelOrder] = useState<CustomerOrder | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelRemarks, setCancelRemarks] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelSaving, setCancelSaving] = useState(false);
  const [responseModal, setResponseModal] = useState<{
    kind: "delivered" | "issue";
    order: CustomerOrder;
  } | null>(null);
  const [responseRating, setResponseRating] = useState(0);
  const [responseIssue, setResponseIssue] = useState("");
  const [responseRemarks, setResponseRemarks] = useState("");
  const [responseError, setResponseError] = useState("");
  const [responseSaving, setResponseSaving] = useState(false);

  const activeMobile = useMemo(() => normalizeMobile(mobile), [mobile]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("raileats_user");
      const user = raw ? JSON.parse(raw) : null;
      setMobile(user?.mobile || "");
    } catch {
      setMobile("");
    }
  }, []);

  useEffect(() => {
    setCurrentTime(Date.now());
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeMobile) {
      setLoading(false);
      return;
    }

    let ignore = false;

    async function loadOrders() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/profile/orders?mobile=${encodeURIComponent(activeMobile)}`,
          { cache: "no-store" },
        );
        const json = (await response.json()) as OrdersResponse;
        if (ignore) return;

        if (!response.ok || !json.ok) {
          setOrders([]);
          setError(
            json.error === "customer_response_storage_not_configured"
              ? "Customer response service is not configured yet."
              : "Unable to load orders right now.",
          );
          return;
        }

        setOrders(Array.isArray(json.orders) ? json.orders : []);
      } catch {
        if (!ignore) {
          setOrders([]);
          setError("Unable to load orders right now.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadOrders();
    return () => {
      ignore = true;
    };
  }, [activeMobile]);

  function openCancelModal(order: CustomerOrder) {
    setCancelOrder(order);
    setCancelReason("");
    setCancelRemarks("");
    setCancelError("");
  }

  function closeCancelModal() {
    if (cancelSaving) return;
    setCancelOrder(null);
    setCancelReason("");
    setCancelRemarks("");
    setCancelError("");
  }

  async function submitCancellationRequest() {
    if (!cancelOrder || cancelSaving) return;

    const reason = cancelReason.trim();
    const remarks = cancelRemarks.trim();
    if (!reason) {
      setCancelError("Please select a reason.");
      return;
    }
    if (reason === "Other" && !remarks) {
      setCancelError("Please enter remarks when the reason is Other.");
      return;
    }

    setCancelSaving(true);
    setCancelError("");

    try {
      const response = await fetch("/api/profile/orders/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel_request",
          orderId: cancelOrder.orderId,
          mobile: activeMobile,
          reason,
          remarks: remarks || undefined,
        }),
      });
      const json = (await response.json().catch(() => ({}))) as CancelResponse;

      if (!response.ok || !json.ok || !json.order) {
        const messageByCode: Record<string, string> = {
          cancellation_already_requested:
            "Cancellation has already been requested for this order.",
          cancellation_window_closed:
            "The cancellation window for this order has closed.",
          status_not_eligible:
            "This order is no longer eligible for cancellation.",
          customer_mismatch: "This order does not belong to your account.",
          order_not_found: "Order not found.",
        };
        setCancelError(
          messageByCode[String(json.error || "")] ||
            "Unable to submit cancellation request.",
        );
        return;
      }

      setOrders((current) =>
        current.map((order) =>
          order.orderId === cancelOrder.orderId
            ? {
                ...order,
                status: json.order!.status,
                subStatus: json.order!.subStatus,
                updatedAt: json.order!.updatedAt,
                currentStageAt: json.order!.updatedAt,
              }
            : order,
        ),
      );
      setCancelOrder(null);
      setCancelReason("");
      setCancelRemarks("");
    } catch {
      setCancelError("Unable to submit cancellation request.");
    } finally {
      setCancelSaving(false);
    }
  }

  function openResponseModal(
    kind: "delivered" | "issue",
    order: CustomerOrder,
  ) {
    setResponseModal({ kind, order });
    setResponseRating(0);
    setResponseIssue("");
    setResponseRemarks("");
    setResponseError("");
  }

  function closeResponseModal() {
    if (responseSaving) return;
    setResponseModal(null);
    setResponseError("");
  }

  async function submitCustomerResponse() {
    if (!responseModal || responseSaving) return;
    if (
      responseModal.kind === "issue" &&
      (!responseIssue ||
        (responseIssue === "Other" && !responseRemarks.trim()))
    ) {
      setResponseError(
        responseIssue ? "Please enter remarks." : "Please select an issue reason.",
      );
      return;
    }

    setResponseSaving(true);
    setResponseError("");
    try {
      const response = await fetch("/api/profile/orders/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:
            responseModal.kind === "delivered"
              ? "customer_delivered"
              : "customer_issue",
          orderId: responseModal.order.orderId,
          mobile: activeMobile,
          rating: responseRating || undefined,
          issueType: responseIssue || undefined,
          remarks: responseRemarks.trim() || undefined,
        }),
      });
      const json = (await response.json().catch(() => ({}))) as CancelResponse;
      if (!response.ok || !json.ok || !json.customerResponse) {
        const messages: Record<string, string> = {
          delivery_confirmation_not_available:
            "This action is not available yet.",
          customer_response_already_submitted:
            "A response has already been submitted for this order.",
          customer_mismatch: "This order does not belong to your account.",
          order_not_found: "Order not found.",
          invalid_delivery_datetime: "The delivery time is invalid.",
          invalid_issue_reason: "Please select a valid issue reason.",
          remarks_required: "Please enter remarks.",
          customer_response_storage_not_configured:
            "Customer response service is not configured yet.",
        };
        setResponseError(
          messages[String(json.error || "")] ||
            [
              String(json.error || "request_failed"),
              json.table ? `table: ${json.table}` : "",
              json.column ? `column: ${json.column}` : "",
              json.databaseMessage || "",
            ]
              .filter(Boolean)
              .join(" — "),
        );
        return;
      }

      const savedResponse = json.customerResponse;
      setOrders((current) =>
        current.map((order) =>
          order.orderId === responseModal.order.orderId
            ? { ...order, customerResponse: savedResponse }
            : order,
        ),
      );
      setResponseModal(null);
    } catch {
      setResponseError("Unable to submit your response.");
    } finally {
      setResponseSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-black text-slate-900"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="text-base font-black text-slate-950">My Orders</h1>
        <div className="h-9 w-9" />
      </div>

      <section className="mx-auto w-full max-w-screen-sm p-3">
        <h2 className="mb-3 text-center text-base font-black uppercase tracking-wide text-red-500">
          Order History
        </h2>

        {!activeMobile && (
          <div className="rounded-2xl bg-orange-50 p-4 text-sm font-bold text-orange-700">
            Login mobile number missing. Please login again.
          </div>
        )}
        {loading && (
          <div className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-500 shadow">
            Loading your orders...
          </div>
        )}
        {!loading && error && (
          <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
            {error}
          </div>
        )}
        {!loading && !error && activeMobile && orders.length === 0 && (
          <div className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-500 shadow">
            No orders found.
          </div>
        )}

        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order.orderId}
              order={order}
              currentTime={currentTime}
              onCancel={() => openCancelModal(order)}
              onDelivered={() => openResponseModal("delivered", order)}
              onIssue={() => openResponseModal("issue", order)}
              onOpen={() =>
                router.push(
                  `/profile/orders/${encodeURIComponent(order.orderId)}`,
                )
              }
            />
          ))}
        </div>
      </section>

      {cancelOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-black text-slate-950">Cancel Order</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Order ID: <strong>#{cancelOrder.orderId}</strong>
            </p>

            <label className="mt-5 grid gap-1.5 text-xs font-black text-slate-800">
              Reason *
              <select
                value={cancelReason}
                onChange={(event) => {
                  setCancelReason(event.target.value);
                  setCancelError("");
                }}
                className="rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold outline-none focus:border-red-500"
              >
                <option value="">Select reason</option>
                {CANCEL_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 grid gap-1.5 text-xs font-black text-slate-800">
              Remarks{cancelReason === "Other" ? " *" : ""}
              <textarea
                value={cancelRemarks}
                onChange={(event) => {
                  setCancelRemarks(event.target.value);
                  setCancelError("");
                }}
                rows={4}
                placeholder="Enter remarks"
                className="resize-y rounded-xl border border-slate-300 p-3 text-sm font-semibold outline-none focus:border-red-500"
              />
            </label>

            {cancelError && (
              <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">
                {cancelError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={cancelSaving}
                onClick={closeCancelModal}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={cancelSaving}
                onClick={submitCancellationRequest}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelSaving ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {responseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-black text-slate-950">
              {responseModal.kind === "delivered"
                ? "Confirm Delivery"
                : "Issue With Order"}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Order ID: <strong>#{responseModal.order.orderId}</strong>
            </p>

            {responseModal.kind === "delivered" ? (
              <div className="mt-5">
                <div className="text-xs font-black text-slate-800">
                  Rating
                </div>
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setResponseRating(rating)}
                      className={`text-3xl ${
                        rating <= responseRating
                          ? "text-amber-400"
                          : "text-slate-300"
                      }`}
                      aria-label={`${rating} star rating`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <label className="mt-5 grid gap-1.5 text-xs font-black text-slate-800">
                Issue Reason *
                <select
                  value={responseIssue}
                  onChange={(event) => {
                    setResponseIssue(event.target.value);
                    setResponseError("");
                  }}
                  className="rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold"
                >
                  <option value="">Select issue reason</option>
                  {ISSUE_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="mt-4 grid gap-1.5 text-xs font-black text-slate-800">
              Remarks
              {responseModal.kind === "issue" && responseIssue === "Other"
                ? " *"
                : ""}
              <textarea
                rows={4}
                value={responseRemarks}
                onChange={(event) => {
                  setResponseRemarks(event.target.value);
                  setResponseError("");
                }}
                placeholder="Enter remarks"
                className="resize-y rounded-xl border border-slate-300 p-3 text-sm font-semibold"
              />
            </label>

            {responseError && (
              <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">
                {responseError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={responseSaving}
                onClick={closeResponseModal}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="button"
                disabled={responseSaving}
                onClick={submitCustomerResponse}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
              >
                {responseSaving
                  ? "Submitting..."
                  : responseModal.kind === "delivered"
                    ? "Confirm Delivered"
                    : "Submit Issue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function OrderCard({
  order,
  currentTime,
  onOpen,
  onCancel,
  onDelivered,
  onIssue,
}: {
  order: CustomerOrder;
  currentTime: number | null;
  onOpen: () => void;
  onCancel: () => void;
  onDelivered: () => void;
  onIssue: () => void;
}) {
  const status = titleCase(order.status || "Booked");
  const bookedAt = formatDateTime(order.bookedAt);
  const currentStageAt = formatDateTime(
    order.currentStageAt || order.updatedAt || "",
  );
  const deliveryAt = formatDeliveryDate(order.deliveryDate, order.deliveryTime);
  const itemSummary = getItemSummary(order.items);
  const cancellationRequested = isCancellationRequested(order);
  const cancellationAllowed =
    currentTime !== null && canCustomerCancel(order, currentTime);
  const responseAllowed =
    currentTime !== null &&
    canSubmitCustomerDeliveryResponse(order, currentTime);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left active:scale-[0.99]"
      >
        <div className="flex gap-2.5 p-2.5">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
            <Image
              src={order.imageUrl || "/raileats-logo.png"}
              alt={order.restroName || "RailEats order"}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[13px] font-black leading-tight text-slate-950">
                  {shortText(order.restroName || "RailEats Restaurant", 30)}
                </h3>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-600">
                  {shortText(stationText(order), 30)}
                </p>
                {itemSummary && (
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                    {itemSummary}
                  </p>
                )}
              </div>

              <div className="shrink-0 text-right">
                <div className="max-w-[110px] truncate text-[11px] font-black text-slate-900">
                  #{order.orderId}
                </div>
                <div className="mt-0.5 text-[12px] font-black text-emerald-600">
                  ₹{Math.round(Number(order.totalAmount || 0))}
                </div>
                <div className="text-[10px] font-bold text-emerald-600">
                  {order.paymentMode || "-"}
                </div>
              </div>
            </div>

            <div className="mt-1.5 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
              <span>Train: {order.trainNumber || "-"}</span>
              <span className="text-right">
                Seat:{" "}
                {[order.coach, order.seat].filter(Boolean).join("/") || "-"}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 px-3 py-2">
          <div className="flex gap-2.5">
            <div className="flex flex-col items-center pt-1">
              <span className="h-4 w-4 rounded-full bg-green-600" />
              <span className="h-8 w-0.5 bg-green-600" />
              <span className="h-4 w-4 rounded-full bg-green-600" />
            </div>
            <div className="space-y-1.5">
              <div>
                <div className="text-[12px] font-black text-slate-900">
                  Booked
                </div>
                <div className="text-[10px] font-semibold text-slate-500">
                  {bookedAt || "Order created"}
                </div>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="text-[12px] font-black text-slate-900">
                    {status}
                  </div>
                  {order.subStatus && (
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-black text-orange-600">
                      {titleCase(order.subStatus)}
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-semibold text-slate-500">
                  {currentStageAt || "Current order stage"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 px-3 py-2 text-[12px]">
          <span className="font-black text-slate-900">Delivery Date : </span>
          <span className="font-semibold text-slate-600">
            {deliveryAt || "-"}
          </span>
        </div>
      </button>

      {(order.customerResponse ||
        responseAllowed ||
        cancellationAllowed ||
        cancellationRequested) && (
        <div className="border-t border-slate-200 px-3 py-2.5">
          {order.customerResponse?.action === "Delivered" ? (
            <span className="inline-flex rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
              Customer Confirmed Delivered
            </span>
          ) : order.customerResponse?.action === "Issue" ? (
            <span className="inline-flex rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700">
              Issue Reported
              {order.customerResponse.issueType
                ? `: ${order.customerResponse.issueType}`
                : ""}
            </span>
          ) : responseAllowed ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onDelivered}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white active:scale-[0.98]"
              >
                Mark Delivered
              </button>
              <button
                type="button"
                onClick={onIssue}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white active:scale-[0.98]"
              >
                Issue With Order
              </button>
            </div>
          ) : cancellationRequested ? (
            <span className="inline-flex rounded-xl bg-orange-50 px-3 py-2 text-xs font-black text-orange-700">
              Cancellation Requested
            </span>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600 active:scale-[0.98]"
            >
              Cancel Order
            </button>
          )}
        </div>
      )}
    </article>
  );
}
