"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";

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

type OrderItem = { itemName: string; quantity: number; lineTotal: number };
type OrderHistory = {
  oldStatus: string;
  newStatus: string;
  note: string;
  changedBy: string;
  changedAt: string;
  subStatus: string;
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
  customerName?: string;
  customerMobile?: string;
  pnr?: string;
  subTotal?: number;
  gstAmount?: number;
  platformCharge?: number;
  totalAmount: number;
  paymentMode: string;
  status: string;
  subStatus?: string;
  bookedAt: string;
  currentStageAt?: string;
  updatedAt?: string;
  bookingSource?: string;
  imageUrl: string;
  items?: OrderItem[];
  history?: OrderHistory[];
  customerResponse?: CustomerResponse | null;
};
type OrdersResponse = {
  ok: boolean;
  orders?: CustomerOrder[];
  error?: string;
};
type ActionResponse = {
  ok: boolean;
  error?: string;
  databaseMessage?: string;
  table?: string;
  column?: string;
  order?: {
    status: string;
    subStatus: string;
    updatedAt: string;
  };
  customerResponse?: CustomerResponse;
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

function normalizeMobile(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(-10);
}
function titleCase(value: unknown) {
  return String(value ?? "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function money(value: unknown) {
  return `₹${Math.round(Number(value || 0))}`;
}
function formatDateTime(value: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return value || "-";
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
  return date
    ? date.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : [dateValue, timeValue].filter(Boolean).join(" ") || "-";
}
function actionErrorMessage(error: unknown) {
  const messages: Record<string, string> = {
    cancellation_window_closed: "The cancellation window has closed.",
    cancellation_already_requested:
      "Cancellation has already been requested.",
    status_not_eligible: "This order is not eligible for cancellation.",
    delivery_confirmation_not_available: "This action is not available yet.",
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
  return messages[String(error || "")] || "Unable to submit your request.";
}

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = decodeURIComponent(String(params?.orderid || ""));
  const [mobile, setMobile] = useState("");
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [modal, setModal] = useState<
    "cancel" | "delivered" | "issue" | null
  >(null);
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [rating, setRating] = useState(0);
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);
  const activeMobile = useMemo(() => normalizeMobile(mobile), [mobile]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("raileats_user");
      setMobile(raw ? JSON.parse(raw)?.mobile || "" : "");
    } catch {
      setMobile("");
    }
  }, []);

  useEffect(() => {
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeMobile || !orderId) {
      setLoading(false);
      return;
    }
    let ignore = false;
    async function loadOrder() {
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
          setError(
            json.error === "customer_response_storage_not_configured"
              ? "Customer response service is not configured yet."
              : "Unable to load order.",
          );
          return;
        }
        const found =
          (json.orders || []).find(
            (item) => String(item.orderId) === orderId,
          ) || null;
        setOrder(found);
        if (!found) setError("Order not found.");
      } catch {
        if (!ignore) setError("Unable to load order.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadOrder();
    return () => {
      ignore = true;
    };
  }, [activeMobile, orderId]);

  function openModal(kind: "cancel" | "delivered" | "issue") {
    setModal(kind);
    setReason("");
    setRemarks("");
    setRating(0);
    setModalError("");
  }

  async function submitAction() {
    if (!order || !modal || saving) return;
    if (!reason && (modal === "cancel" || modal === "issue")) {
      setModalError(
        modal === "cancel"
          ? "Please select a reason."
          : "Please select an issue reason.",
      );
      return;
    }
    if (reason === "Other" && !remarks.trim()) {
      setModalError("Please enter remarks.");
      return;
    }

    setSaving(true);
    setModalError("");
    try {
      const response = await fetch("/api/profile/orders/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:
            modal === "cancel"
              ? "cancel_request"
              : modal === "delivered"
                ? "customer_delivered"
                : "customer_issue",
          orderId: order.orderId,
          mobile: activeMobile,
          reason: modal === "cancel" ? reason : undefined,
          issueType: modal === "issue" ? reason : undefined,
          rating: modal === "delivered" ? rating || undefined : undefined,
          remarks: remarks.trim() || undefined,
        }),
      });
      const json = (await response.json().catch(() => ({}))) as ActionResponse;
      if (!response.ok || !json.ok) {
        const knownMessage = actionErrorMessage(json.error);
        setModalError(
          knownMessage !== "Unable to submit your request."
            ? knownMessage
            : [
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

      if (modal === "cancel" && json.order) {
        setOrder((current) =>
          current
            ? {
                ...current,
                status: json.order!.status,
                subStatus: json.order!.subStatus,
                updatedAt: json.order!.updatedAt,
                currentStageAt: json.order!.updatedAt,
              }
            : current,
        );
      } else if (json.customerResponse) {
        const savedResponse = json.customerResponse;
        setOrder((current) =>
          current
            ? { ...current, customerResponse: savedResponse }
            : current,
        );
      }
      setModal(null);
    } catch {
      setModalError("Unable to submit your request.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 font-bold text-slate-600">
        Loading order details...
      </main>
    );
  }
  if (error || !order) {
    return (
      <main className="min-h-screen bg-slate-50 p-5">
        <button onClick={() => router.back()} className="text-2xl font-black">
          ←
        </button>
        <div className="mx-auto mt-8 max-w-screen-md rounded-2xl bg-white p-6 shadow">
          {error || "Order not found."}
        </div>
      </main>
    );
  }

  const cancellationRequested =
    normalizeOrderStatus(order.status) === "cancellationrequest";
  const cancellationAllowed =
    nowMs !== null && canCustomerCancel(order, nowMs);
  const responseAllowed =
    nowMs !== null && canSubmitCustomerDeliveryResponse(order, nowMs);
  const timeline =
    order.history && order.history.length
      ? order.history
      : [
          {
            oldStatus: "",
            newStatus: "Booked",
            note: "Order created",
            changedBy: "",
            changedAt: order.bookedAt,
            subStatus: "",
          },
          {
            oldStatus: "",
            newStatus: order.status,
            note: order.subStatus || "Current order stage",
            changedBy: "",
            changedAt: order.currentStageAt || order.updatedAt || "",
            subStatus: order.subStatus || "",
          },
        ];

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-30 border-b bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-screen-md items-center justify-between px-4">
          <button onClick={() => router.back()} className="text-2xl font-black">
            ←
          </button>
          <h1 className="text-lg font-black">Order Details</h1>
          <div className="h-10 w-10" />
        </div>
      </header>

      <section className="mx-auto w-full max-w-screen-md space-y-4 p-4">
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex gap-3 p-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
              <Image
                src={order.imageUrl || "/raileats-logo.png"}
                alt={order.restroName || "RailEats order"}
                fill
                sizes="80px"
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{order.restroName}</h2>
                  <p className="text-sm font-semibold text-slate-600">
                    {[order.stationCode, order.stationName]
                      .filter(Boolean)
                      .join(" - ")}
                  </p>
                  <p className="text-xs font-bold text-slate-500">
                    Order ID: #{order.orderId}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-emerald-600">
                    {money(order.totalAmount)}
                  </div>
                  <div className="text-xs font-black text-emerald-600">
                    {order.paymentMode || "-"}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge text={titleCase(order.status || "Booked")} />
                {order.subStatus && <Badge text={titleCase(order.subStatus)} />}
              </div>
            </div>
          </div>
        </div>

        {(order.customerResponse ||
          responseAllowed ||
          cancellationAllowed ||
          cancellationRequested) && (
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            {order.customerResponse?.action === "Delivered" ? (
              <Badge text="Customer Confirmed Delivered" green />
            ) : order.customerResponse?.action === "Issue" ? (
              <Badge
                text={`Issue Reported${order.customerResponse.issueType ? `: ${order.customerResponse.issueType}` : ""}`}
              />
            ) : responseAllowed ? (
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  label="Mark Delivered"
                  onClick={() => openModal("delivered")}
                  green
                />
                <ActionButton
                  label="Issue With Order"
                  onClick={() => openModal("issue")}
                />
              </div>
            ) : cancellationRequested ? (
              <Badge text="Cancellation Requested" />
            ) : (
              <ActionButton
                label="Cancel Order"
                onClick={() => openModal("cancel")}
              />
            )}
          </div>
        )}

        <Card title="Ordered Items">
          {(order.items || []).length ? (
            order.items!.map((item, index) => (
              <InfoRow
                key={`${item.itemName}-${index}`}
                label={`${item.quantity} × ${item.itemName}`}
                value={money(item.lineTotal)}
              />
            ))
          ) : (
            <p className="text-sm text-slate-500">No items available.</p>
          )}
        </Card>

        <Card title="Amount Details">
          <InfoRow label="Sub Total" value={money(order.subTotal)} />
          <InfoRow label="GST" value={money(order.gstAmount)} />
          <InfoRow
            label="Platform Charge"
            value={money(order.platformCharge)}
          />
          <InfoRow label="Grand Total" value={money(order.totalAmount)} />
        </Card>

        <Card title="Order Details">
          <InfoRow label="Order ID" value={`#${order.orderId}`} />
          <InfoRow label="Status" value={titleCase(order.status)} />
          <InfoRow label="Payment Mode" value={order.paymentMode || "-"} />
          <InfoRow label="Booking Source" value={order.bookingSource || "-"} />
          <InfoRow label="Booked At" value={formatDateTime(order.bookedAt)} />
          <InfoRow
            label="Delivery"
            value={formatDeliveryDate(order.deliveryDate, order.deliveryTime)}
          />
        </Card>

        <Card title="Passenger Details">
          <InfoRow label="Passenger Name" value={order.customerName || "-"} />
          <InfoRow label="Mobile Number" value={order.customerMobile || "-"} />
          <InfoRow label="PNR Number" value={order.pnr || "-"} />
        </Card>

        <Card title="Journey Details">
          <InfoRow label="Restaurant" value={order.restroName || "-"} />
          <InfoRow label="Train Number" value={order.trainNumber || "-"} />
          <InfoRow
            label="Coach / Seat"
            value={[order.coach, order.seat].filter(Boolean).join(" / ") || "-"}
          />
        </Card>

        <Card title="Order Timeline">
          <div className="space-y-5">
            {timeline.map((step, index) => (
              <div key={`${step.changedAt}-${index}`} className="flex gap-4">
                <span className="mt-1 h-4 w-4 shrink-0 rounded-full bg-green-600" />
                <div>
                  <div className="font-black">
                    {titleCase(step.newStatus || step.subStatus)}
                  </div>
                  {step.note && (
                    <div className="text-xs font-semibold text-slate-500">
                      {step.note}
                    </div>
                  )}
                  <div className="text-xs text-slate-500">
                    {formatDateTime(step.changedAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-black">
              {modal === "cancel"
                ? "Cancel Order"
                : modal === "delivered"
                  ? "Confirm Delivery"
                  : "Issue With Order"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Order ID: <strong>#{order.orderId}</strong>
            </p>

            {modal === "delivered" ? (
              <div className="mt-5">
                <div className="text-xs font-black">Rating</div>
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className={`text-3xl ${value <= rating ? "text-amber-400" : "text-slate-300"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <label className="mt-5 grid gap-1.5 text-xs font-black">
                {modal === "cancel" ? "Reason *" : "Issue Reason *"}
                <select
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    setModalError("");
                  }}
                  className="rounded-xl border p-3 text-sm"
                >
                  <option value="">
                    {modal === "cancel" ? "Select reason" : "Select issue reason"}
                  </option>
                  {(modal === "cancel" ? CANCEL_REASONS : ISSUE_REASONS).map(
                    (option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ),
                  )}
                </select>
              </label>
            )}

            <label className="mt-4 grid gap-1.5 text-xs font-black">
              Remarks{reason === "Other" ? " *" : ""}
              <textarea
                rows={4}
                value={remarks}
                onChange={(event) => {
                  setRemarks(event.target.value);
                  setModalError("");
                }}
                placeholder="Enter remarks"
                className="rounded-xl border p-3 text-sm"
              />
            </label>
            {modalError && (
              <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">
                {modalError}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setModal(null)}
                className="rounded-xl border px-4 py-2.5 text-sm font-black"
              >
                Close
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={submitAction}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
              >
                {saving
                  ? "Submitting..."
                  : modal === "cancel"
                    ? "Submit Request"
                    : modal === "delivered"
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

function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <h3 className="border-b px-4 py-3 text-lg font-black">{title}</h3>
      <div className="space-y-3 p-4">{children}</div>
    </div>
  );
}
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className="text-right text-sm font-black">{value || "-"}</span>
    </div>
  );
}
function Badge({ text, green = false }: { text: string; green?: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
        green
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-orange-200 bg-orange-50 text-orange-700"
      }`}
    >
      {text}
    </span>
  );
}
function ActionButton({
  label,
  onClick,
  green = false,
}: {
  label: string;
  onClick: () => void;
  green?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-black text-white ${
        green ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      {label}
    </button>
  );
}
