"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/useAuth";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type CustomerOrder = {
  orderId: string;
  restroCode: string;
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
  bookedAt: string;
  imageUrl: string;
};

type OrdersResponse = {
  ok: boolean;
  count?: number;
  orders?: CustomerOrder[];
  error?: string;
};

export default function ProfilePage() {
  const user = useAuth((s) => s.user);
  const loadUser = useAuth((s) => s.loadUser);
  const logoutStore = useAuth((s) => s.logout);

  const router = useRouter();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  const [showOrders, setShowOrders] = useState(false);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  const [showBulkModal, setShowBulkModal] = useState(false);

  const [trainNumber, setTrainNumber] = useState("");
  const [journeyDate, setJourneyDate] = useState("");
  const [quantity, setQuantity] = useState("");

  const [success, setSuccess] = useState(false);

  const activeMobile = useMemo(
    () => normalizeMobile(mobile || user?.mobile || ""),
    [mobile, user?.mobile],
  );

  useEffect(() => {
    loadUser();

    const raw = localStorage.getItem("raileats_user");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setName(u.name || "");
        setMobile(u.mobile || "");
        setEmail(u.email || "");
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!showOrders || !activeMobile) return;

    let ignore = false;

    async function loadOrders() {
      setOrdersLoading(true);
      setOrdersError("");

      try {
        const response = await fetch(
          `/api/profile/orders?mobile=${encodeURIComponent(activeMobile)}`,
          { cache: "no-store" },
        );
        const result = (await response.json()) as OrdersResponse;

        if (ignore) return;

        if (!response.ok || !result.ok) {
          setOrders([]);
          setOrdersError("Unable to load orders right now.");
          return;
        }

        setOrders(Array.isArray(result.orders) ? result.orders : []);
      } catch {
        if (!ignore) {
          setOrders([]);
          setOrdersError("Unable to load orders right now.");
        }
      } finally {
        if (!ignore) setOrdersLoading(false);
      }
    }

    loadOrders();

    return () => {
      ignore = true;
    };
  }, [showOrders, activeMobile]);

  const handleLogout = () => {
    logoutStore();
    localStorage.removeItem("raileats_user");
    window.location.replace("/");
  };

  const handleSubmit = async () => {
    if (!trainNumber || !journeyDate || !quantity) {
      alert("Please fill all fields");
      return;
    }

    try {
      const { error } = await supabase.from("bulk_order_queries").insert([
        {
          name: user?.name,
          mobile: user?.mobile,
          email: user?.email,
          train_number: trainNumber,
          journey_date: journeyDate,
          quantity: quantity,
        },
      ]);

      if (error) {
        console.error(error);
        alert("Error submitting enquiry");
        return;
      }

      setSuccess(true);
      setTrainNumber("");
      setJourneyDate("");
      setQuantity("");
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };

  return (
    <main className="mx-auto w-full max-w-screen-sm p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">My Profile</h1>

        <button
          onClick={() => router.back()}
          className="text-lg font-bold text-gray-600"
          aria-label="Close profile"
        >
          X
        </button>
      </div>

      <div
        onClick={() => router.push("/profile/edit")}
        className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow cursor-pointer"
      >
        <div className="h-12 w-12 flex items-center justify-center rounded-full bg-red-500 text-white text-lg font-bold">
          {(name || user?.name || "U")?.charAt(0)}
        </div>

        <div className="flex-1">
          <div className="font-semibold text-lg">
            {name || user?.name || "Your Name"}
          </div>
          <div className="text-sm text-gray-500">{mobile || user?.mobile}</div>
        </div>

        <div aria-hidden>✏️</div>
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-3 shadow">
        <Field label="Mobile" value={mobile || user?.mobile || ""} />
        <Field label="Email" value={email || user?.email || ""} />
      </div>

      <div className="rounded-xl border bg-white shadow divide-y">
        <MenuItem
          label="My Orders"
          onClick={() => setShowOrders((value) => !value)}
          open={showOrders}
        />

        <MenuItem label="Group Orders" onClick={() => setShowBulkModal(true)} />

        <MenuItem label="Contact Us" onClick={() => router.push("/contact")} />
        <MenuItem
          label="Feedback"
          onClick={() => {
            const user = JSON.parse(
              localStorage.getItem("raileats_user") || "null",
            );

            if (!user) {
              localStorage.setItem("afterLoginAction", "feedback");
              window.dispatchEvent(new CustomEvent("raileats:open-login"));
            } else {
              window.dispatchEvent(new CustomEvent("raileats:open-feedback"));
            }
          }}
        />
        <MenuItem label="About Us" onClick={() => router.push("/about")} />
        <MenuItem label="FAQ" onClick={() => router.push("/faq")} />
        <MenuItem
          label="Terms & Conditions"
          onClick={() => router.push("/terms")}
        />
        <MenuItem
          label="Privacy Policy"
          onClick={() => router.push("/privacy-policy")}
        />
        <MenuItem
          label="Cancellation Policy"
          onClick={() => router.push("/cancellation-refund")}
        />
      </div>

      {showOrders && (
        <OrderHistorySection
          orders={orders}
          loading={ordersLoading}
          error={ordersError}
          hasMobile={Boolean(activeMobile)}
        />
      )}

      <button
        onClick={handleLogout}
        className="w-full rounded-md bg-red-500 py-2 text-white"
      >
        Logout
      </button>

      <div className="text-center text-sm text-gray-400">Version: 2.2.6</div>

      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 w-[90%] max-w-md space-y-3">
            <h2 className="text-lg font-semibold">Bulk Order Query</h2>

            {success ? (
              <div className="text-green-600 text-center font-medium">
                Your query submitted successfully
              </div>
            ) : (
              <>
                <input
                  placeholder="Train Number"
                  value={trainNumber}
                  onChange={(e) => setTrainNumber(e.target.value)}
                  className="w-full border p-2 rounded"
                />

                <input
                  type="date"
                  value={journeyDate}
                  onChange={(e) => setJourneyDate(e.target.value)}
                  className="w-full border p-2 rounded"
                />

                <input
                  placeholder="Quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full border p-2 rounded"
                />

                <button
                  onClick={handleSubmit}
                  className="w-full bg-yellow-600 text-white py-2 rounded"
                >
                  Submit Enquiry
                </button>
              </>
            )}

            <button
              onClick={() => {
                setShowBulkModal(false);
                setSuccess(false);
              }}
              className="w-full bg-gray-400 text-white py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function OrderHistorySection({
  orders,
  loading,
  error,
  hasMobile,
}: {
  orders: CustomerOrder[];
  loading: boolean;
  error: string;
  hasMobile: boolean;
}) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-950">Order History</h2>
        <span className="text-xs font-bold text-orange-600">
          Latest delivery first
        </span>
      </div>

      {!hasMobile && (
        <div className="rounded-xl bg-orange-50 p-4 text-sm font-semibold text-orange-700">
          Login mobile number missing. Please login again to view orders.
        </div>
      )}

      {loading && (
        <div className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
          Loading your orders...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && hasMobile && orders.length === 0 && (
        <div className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
          No orders found for this mobile number.
        </div>
      )}

      {!loading && !error && orders.map((order) => (
        <OrderCard key={order.orderId} order={order} />
      ))}
    </section>
  );
}

function OrderCard({ order }: { order: CustomerOrder }) {
  const status = titleCase(order.status || "booked");
  const bookedAt = formatDateTime(order.bookedAt);
  const deliveryAt = formatDeliveryDate(order.deliveryDate, order.deliveryTime);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex gap-3 p-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
          <Image
            src={order.imageUrl || "/raileats-logo.png"}
            alt={`${order.restroName} order`}
            fill
            sizes="64px"
            className="object-cover"
            unoptimized
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-black text-slate-950">
                {order.restroName}
              </h3>
              <p className="text-sm font-semibold text-slate-600">
                {stationText(order)}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-sm font-black text-slate-800">
                #{order.orderId}
              </div>
              {order.totalAmount > 0 && (
                <div className="text-sm font-black text-emerald-600">
                  Rs {Math.round(order.totalAmount)}
                </div>
              )}
              {order.paymentMode && (
                <div className="text-xs font-bold text-emerald-600">
                  {order.paymentMode}
                </div>
              )}
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
            <span>Train: {order.trainNumber || "-"}</span>
            <span className="text-right">
              {order.coach || order.seat
                ? `Seat: ${[order.coach, order.seat].filter(Boolean).join("/")}`
                : "Seat: -"}
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
              <div className="text-sm font-black text-slate-900">{status}</div>
              <div className="text-xs font-semibold text-slate-500">
                Current order stage
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        value={value}
        readOnly
        className="w-full rounded-md border px-3 py-2 bg-gray-50"
      />
    </label>
  );
}

function MenuItem({
  label,
  onClick,
  open,
}: {
  label: string;
  onClick?: () => void;
  open?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <span>{label}</span>
      <span>{open ? "⌃" : "›"}</span>
    </div>
  );
}

function normalizeMobile(value: string) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function stationText(order: CustomerOrder) {
  const code = order.stationCode || "";
  const name = order.stationName || "";

  if (code && name) return `${code} - ${name}`;
  return code || name || "Station";
}

function titleCase(value: string) {
  return String(value || "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string) {
  if (!value) return "";
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
  if (!dateValue) return "";
  const composed = `${dateValue}T${timeValue || "00:00:00"}`;
  const date = new Date(composed);

  if (Number.isNaN(date.getTime())) {
    return [dateValue, timeValue].filter(Boolean).join(" ");
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
