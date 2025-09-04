"use client";
import { useEffect, useState } from "react";
import OrderDetailsModal from "../components/OrderDetailsModal";

type Order = {
  id: string; station: string; date: string; amount: number; mode: "Prepaid"|"COD";
  passenger: string; mobile: string; train: string; coach: string; seat: string; pnrLast4: string;
  items: { name: string; qty: number; price: number }[]; bookingDate: string;
};

export default function OrdersPage() {
  const [data, setData] = useState<Order[]>([]);
  const [open, setOpen] = useState<Order|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/orders", { cache: "no-store" });
      const json = await res.json();
      setData(json);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="mx-auto w-full max-w-screen-md p-4">
      <h1 className="text-xl font-semibold mb-3">My Orders</h1>

      {loading ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">Loading…</div>
      ) : data.length === 0 ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">No orders yet.</div>
      ) : (
        <div className="rounded-xl border bg-white divide-y">
          {data.map(o => (
            <button key={o.id} onClick={()=>setOpen(o)} className="w-full text-left px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Order ID: <span className="text-yellow-700">{o.id}</span></p>
                  <p className="text-xs text-gray-600">{o.station} • {o.date} • {o.mode}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₹{o.amount}</p>
                  <p className="text-xs text-gray-500">Tap for details</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && <OrderDetailsModal order={open} onClose={()=>setOpen(null)} />}
    </main>
  );
}
