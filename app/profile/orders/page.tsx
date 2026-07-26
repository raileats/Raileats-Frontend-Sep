"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  error?: string;
};

const CANCEL_REASONS = [
  "Customer Plan Changed",
  "Train Cancelled",
  "Booked by Mistake",
  "Duplicate Order",
  "Wrong Order Details",
  "Other",
] as const;

const INDIA_OFFSET_MINUTES = 330;
const CANCELLATION_CUTOFF_MINUTES = 90;

function normalizeMobile(value: string) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function normalizeStatus(value: string) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function parseDeliveryDateTime(
  deliveryDate: string,
  deliveryTime: string,
) {
  const dateMatch = String(deliveryDate || "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})/);
  const timeMatch = String(deliveryTime || "00:00")
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);

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

function canCustomerCancel(
  order: CustomerOrder,
  currentTime = Date.now(),
) {
  const status = normalizeStatus(order.status);
  if (!["booked", "inverification", "neworder"].includes(status)) {
    return false;
  }

  const deliveryDateTime = parseDeliveryDateTime(
    order.deliveryDate,
    order.deliveryTime,
  );
  if (!deliveryDateTime) return false;

  const cutoff =
    deliveryDateTime.getTime() - CANCELLATION_CUTOFF_MINUTES * 60_000;
  return currentTime <= cutoff;
}

function isCancellationRequested(order: CustomerOrder) {
  return normalizeStatus(order.status) === "cancellationrequest";
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
  const date = parseDeliveryDateTime(dateValue, timeValue);
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
          setError("Unable to load orders right now.");
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
    </main>
  );
}

function OrderCard({
  order,
  currentTime,
  onOpen,
  onCancel,
}: {
  order: CustomerOrder;
  currentTime: number | null;
  onOpen: () => void;
  onCancel: () => void;
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

      {(cancellationAllowed || cancellationRequested) && (
        <div className="border-t border-slate-200 px-3 py-2.5">
          {cancellationRequested ? (
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
