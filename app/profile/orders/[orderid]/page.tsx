"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type OrderItem = {
  itemName: string;
  quantity: number;
  lineTotal: number;
};

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
};

type OrdersResponse = {
  ok: boolean;
  orders?: CustomerOrder[];
  error?: string;
};

function normalizeMobile(value: string) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function titleCase(value: string) {
  return String(value || "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDeliveryDate(dateValue: string, timeValue: string) {
  if (!dateValue) return "-";

  const composed = `${dateValue}T${timeValue || "00:00:00"}`;
  const date = new Date(composed);

  if (Number.isNaN(date.getTime())) {
    return [dateValue, timeValue].filter(Boolean).join(" ") || "-";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(value: number | string | undefined | null) {
  return `₹${Math.round(Number(value || 0))}`;
}

function stationText(order: CustomerOrder) {
  const code = order.stationCode || "";
  const name = order.stationName || "";

  if (code && name) return `${code} - ${name}`;
  return code || name || "Station";
}

function coachSeatText(order: CustomerOrder) {
  const text = [order.coach, order.seat].filter(Boolean).join(" / ");
  return text || "-";
}

function safeText(value: any) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function getStatusColor(status: string) {
  const clean = String(status || "").toLowerCase();

  if (clean.includes("deliver")) return "bg-green-50 text-green-700 border-green-200";
  if (clean.includes("cancel")) return "bg-red-50 text-red-700 border-red-200";
  if (clean.includes("prepar")) return "bg-orange-50 text-orange-700 border-orange-200";
  if (clean.includes("book")) return "bg-blue-50 text-blue-700 border-blue-200";

  return "bg-slate-50 text-slate-700 border-slate-200";
}

function getTimeline(order: CustomerOrder | null) {
  if (!order) return [];

  const history = Array.isArray(order.history) ? order.history : [];

  if (history.length > 0) {
    return history.map((entry) => ({
      title: titleCase(entry.newStatus || entry.subStatus || "Order Update"),
      subTitle: entry.note || entry.subStatus || "",
      time: entry.changedAt || "",
    }));
  }

  return [
    {
      title: "Booked",
      subTitle: "Order created",
      time: order.bookedAt || "",
    },
    {
      title: titleCase(order.status || "Booked"),
      subTitle: order.subStatus || "Current order stage",
      time: order.currentStageAt || order.updatedAt || order.bookedAt || "",
    },
  ];
}
export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const orderId = decodeURIComponent(
    String(params?.orderid || "")
  );

  const [mobile, setMobile] = useState("");
  const [order, setOrder] = useState<CustomerOrder | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeMobile = useMemo(
    () => normalizeMobile(mobile),
    [mobile]
  );

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
    if (!activeMobile || !orderId) {
      setLoading(false);
      return;
    }

    let ignore = false;

    async function loadOrder() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `/api/profile/orders?mobile=${encodeURIComponent(activeMobile)}`,
          {
            cache: "no-store",
          }
        );

        const json =
          (await res.json()) as OrdersResponse;

        if (ignore) return;

        if (!res.ok || !json.ok) {
          setError("Unable to load order.");
          setLoading(false);
          return;
        }

        const found =
          (json.orders || []).find(
            (x) =>
              String(x.orderId) ===
              String(orderId)
          ) || null;

        if (!found) {
          setError("Order not found.");
          setLoading(false);
          return;
        }

        setOrder(found);
      } catch {
        if (!ignore) {
          setError(
            "Unable to load order."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      ignore = true;
    };
  }, [activeMobile, orderId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-lg font-bold text-slate-600">
          Loading order details...
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-slate-50">

        <div className="sticky top-0 z-30 bg-white border-b shadow-sm">

          <div className="mx-auto flex h-16 max-w-screen-md items-center px-4">

            <button
              onClick={() => router.back()}
              className="mr-3 flex h-11 w-11 items-center justify-center rounded-full border bg-white text-2xl font-black"
            >
              ←
            </button>

            <h1 className="text-xl font-black">
              Order Details
            </h1>

          </div>

        </div>

        <div className="mx-auto max-w-screen-md p-5">

          <div className="rounded-2xl bg-white p-6 shadow">

            <h2 className="text-xl font-black">
              Order #{orderId}
            </h2>

            <p className="mt-3 text-slate-600">
              {error}
            </p>

          </div>

        </div>

      </main>
    );
  }

  const timeline = getTimeline(order);
    return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-screen-md items-center justify-between px-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl font-black text-slate-900"
            aria-label="Back"
          >
            ←
          </button>

          <h1 className="text-lg font-black text-slate-950">
            Order Details
          </h1>

          <div className="h-10 w-10" />
        </div>
      </div>

      <section className="mx-auto w-full max-w-screen-md space-y-4 p-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-black leading-tight text-slate-950">
                    {safeText(order.restroName)}
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {stationText(order)}
                  </p>

                  <p className="mt-1 text-xs font-bold text-slate-500">
                    Order ID: #{order.orderId}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-lg font-black text-emerald-600">
                    {money(order.totalAmount)}
                  </div>

                  <div className="text-xs font-black text-emerald-600">
                    {order.paymentMode || "-"}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusColor(
                    order.status
                  )}`}
                >
                  {titleCase(order.status || "Booked")}
                </span>

                {order.subStatus && (
                  <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black text-orange-600">
                    {titleCase(order.subStatus)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-slate-200 text-sm">
            <div className="border-r border-slate-200 p-3">
              <div className="text-xs font-bold uppercase text-slate-400">
                Train
              </div>
              <div className="mt-1 font-black text-slate-900">
                {order.trainNumber || "-"}
              </div>
            </div>

            <div className="p-3">
              <div className="text-xs font-bold uppercase text-slate-400">
                Coach / Seat
              </div>
              <div className="mt-1 font-black text-slate-900">
                {coachSeatText(order)}
              </div>
            </div>
          </div>
        </div>
                {/* ================= ITEMS ================= */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-lg font-black text-slate-900">
              Ordered Items
            </h3>
          </div>

          {(order.items || []).length === 0 ? (
            <div className="p-4 text-sm font-semibold text-slate-500">
              No items available.
            </div>
          ) : (
            <div>
              {order.items!.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between px-4 py-3 ${
                    index !== order.items!.length - 1
                      ? "border-b border-slate-200"
                      : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-black text-slate-900">
                      {item.quantity} × {item.itemName}
                    </div>
                  </div>

                  <div className="ml-3 text-[15px] font-black text-slate-900">
                    {money(item.lineTotal)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================= AMOUNT ================= */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-lg font-black text-slate-900">
              Amount Details
            </h3>
          </div>

          <div className="space-y-3 p-4 text-[15px]">

            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">
                Sub Total
              </span>

              <span className="font-black">
                {money(order.subTotal)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">
                GST
              </span>

              <span className="font-black">
                {money(order.gstAmount)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">
                Platform Charge
              </span>

              <span className="font-black">
                {money(order.platformCharge)}
              </span>
            </div>

            <div className="border-t pt-3 flex items-center justify-between">

              <span className="text-lg font-black">
                Grand Total
              </span>

              <span className="text-lg font-black text-emerald-600">
                {money(order.totalAmount)}
              </span>

            </div>

          </div>
        </div>
                {/* ================= ORDER DETAILS ================= */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-lg font-black text-slate-900">
              Order Details
            </h3>
          </div>

          <div className="space-y-3 p-4 text-[15px]">

            <InfoRow
              label="Order ID"
              value={`#${order.orderId}`}
            />

            <InfoRow
              label="Status"
              value={titleCase(order.status)}
            />

            <InfoRow
              label="Payment Mode"
              value={safeText(order.paymentMode)}
            />

            <InfoRow
              label="Booking Source"
              value={safeText(order.bookingSource)}
            />

            <InfoRow
              label="Booked At"
              value={formatDateTime(order.bookedAt)}
            />

            <InfoRow
              label="Current Update"
              value={formatDateTime(
                order.currentStageAt ||
                order.updatedAt
              )}
            />

            <InfoRow
              label="Delivery"
              value={formatDeliveryDate(
                order.deliveryDate,
                order.deliveryTime
              )}
            />

          </div>
        </div>

        {/* ================= PASSENGER ================= */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-lg font-black text-slate-900">
              Passenger Details
            </h3>
          </div>

          <div className="space-y-3 p-4 text-[15px]">

            <InfoRow
              label="Passenger Name"
              value={safeText(order.customerName)}
            />

            <InfoRow
              label="Mobile Number"
              value={safeText(order.customerMobile)}
            />

            <InfoRow
              label="PNR Number"
              value={safeText(order.pnr)}
            />

          </div>

        </div>

        {/* ================= JOURNEY ================= */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-lg font-black text-slate-900">
              Journey Details
            </h3>
          </div>

          <div className="space-y-3 p-4 text-[15px]">

            <InfoRow
              label="Restaurant"
              value={safeText(order.restroName)}
            />

            <InfoRow
              label="Station"
              value={stationText(order)}
            />

            <InfoRow
              label="Train Number"
              value={safeText(order.trainNumber)}
            />

            <InfoRow
              label="Coach / Seat"
              value={coachSeatText(order)}
            />

          </div>

        </div>

        {/* ================= ORDER TIMELINE ================= */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-lg font-black text-slate-900">
              Order Timeline
            </h3>
          </div>

          <div className="p-4 space-y-5">

            {timeline.map((step, index) => (

              <div
                key={index}
                className="flex gap-4"
              >

                <div className="flex flex-col items-center">

                  <span className="h-4 w-4 rounded-full bg-green-600" />

                  {index !== timeline.length - 1 && (
                    <span className="w-0.5 flex-1 bg-green-600" />
                  )}

                </div>

                <div className="flex-1">

                  <div className="text-[15px] font-black text-slate-900">
                    {step.title}
                  </div>

                  {step.subTitle && (
                    <div className="text-xs font-semibold text-slate-500 mt-1">
                      {step.subTitle}
                    </div>
                  )}

                  <div className="mt-1 text-xs text-slate-500">
                    {formatDateTime(step.time)}
                  </div>

                </div>

              </div>

            ))}

          </div>

        </div>
              </section>
    </main>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <span className="shrink-0 text-sm font-semibold text-slate-500">
        {label}
      </span>

      <span className="text-right text-sm font-black text-slate-900">
        {value || "-"}
      </span>
    </div>
  );
}
