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

function normalizeMobile(value: string) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function titleCase(value: string) {
  return String(value || "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDateTime(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDeliveryDate(dateValue: string, timeValue: string) {
  if (!dateValue) return "";
  const d = new Date(`${dateValue}T${timeValue || "00:00:00"}`);

  if (Number.isNaN(d.getTime())) {
    return [dateValue, timeValue].filter(Boolean).join(" ");
  }

  return d.toLocaleString("en-IN", {
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

export default function MyOrdersPage() {
  const router = useRouter();

  const [mobile, setMobile] = useState("");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    if (!activeMobile) {
      setLoading(false);
      return;
    }

    let ignore = false;

    async function loadOrders() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `/api/profile/orders?mobile=${encodeURIComponent(activeMobile)}`,
          { cache: "no-store" }
        );

        const json = (await res.json()) as OrdersResponse;

        if (ignore) return;

        if (!res.ok || !json.ok) {
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

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl font-black text-slate-900"
        >
          ←
        </button>

        <h1 className="text-lg font-black text-slate-950">My Orders</h1>

        <div className="h-10 w-10" />
      </div>

      <section className="mx-auto w-full max-w-screen-sm p-4">
        <h2 className="mb-4 text-center text-lg font-black uppercase tracking-wide text-red-500">
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

        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.orderId} order={order} />
          ))}
        </div>
      </section>
    </main>
  );
}

function OrderCard({ order }: { order: CustomerOrder }) {
  const status = titleCase(order.status || "Booked");
  const bookedAt = formatDateTime(order.bookedAt);
  const currentStageAt = formatDateTime(
    order.currentStageAt || order.updatedAt || ""
  );
  const deliveryAt = formatDeliveryDate(order.deliveryDate, order.deliveryTime);

  const itemSummary = (order.items || [])
    .slice(0, 2)
    .map((item) =>
      item.quantity > 0 ? `${item.quantity}x ${item.itemName}` : item.itemName
    )
    .join(", ");

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex gap-3 p-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
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
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-black leading-tight text-slate-950">
                {order.restroName || "RailEats Restaurant"}
              </h3>

              <p className="mt-1 text-sm font-semibold text-slate-600">
                {stationText(order)}
              </p>

              {itemSummary && (
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                  {itemSummary}
                </p>
              )}
            </div>

            <div className="shrink-0 text-right">
              <div className="max-w-[130px] truncate text-sm font-black text-slate-900">
                #{order.orderId}
              </div>

              <div className="mt-1 text-sm font-black text-emerald-600">
                ₹{Math.round(Number(order.totalAmount || 0))}
              </div>

              <div className="text-xs font-bold text-emerald-600">
                {order.paymentMode || "-"}
              </div>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
            <span>Train: {order.trainNumber || "-"}</span>
            <span className="text-right">
              Seat: {[order.coach, order.seat].filter(Boolean).join("/") || "-"}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 px-4 py-3">
        <div className="flex gap-3">
          <div className="flex flex-col items-center pt-1">
            <span className="h-5 w-5 rounded-full bg-green-600" />
            <span className="h-10 w-0.5 bg-green-600" />
            <span className="h-5 w-5 rounded-full bg-green-600" />
          </div>

          <div className="space-y-2">
            <div>
              <div className="text-sm font-black text-slate-900">Booked</div>
              <div className="text-xs font-semibold text-slate-500">
                {bookedAt || "Order created"}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-black text-slate-900">
                  {status}
                </div>

                {order.subStatus && (
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-black text-orange-600">
                    {titleCase(order.subStatus)}
                  </span>
                )}
              </div>

              <div className="text-xs font-semibold text-slate-500">
                {currentStageAt || "Current order stage"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 px-4 py-3 text-sm">
        <span className="font-black text-slate-900">Delivery Date : </span>
        <span className="font-semibold text-slate-600">
          {deliveryAt || "-"}
        </span>
      </div>
    </article>
  );
}
