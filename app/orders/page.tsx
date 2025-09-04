"use client";
import { useMemo, useState } from "react";
import OrderDetailsModal from "../components/OrderDetailsModal";

type Order = {
  id: string; station: string; date: string; amount: number; mode: "Prepaid"|"COD";
  passenger: string; mobile: string; train: string; coach: string; seat: string; pnrLast4: string;
  items: { name: string; qty: number; price: number }[];
  bookingDate: string;
};

export default function OrdersPage() {
  // mock data (replace with API later)
  const data = useMemo<Order[]>(() => [
    {
      id: "RE-240915-001",
      station: "NDLS",
      date: "2025-09-05",
      amount: 420,
      mode: "Prepaid",
      passenger: "A Kumar",
      mobile: "98xxxxxx12",
      train: "12345",
      coach: "B3",
      seat: "32",
      pnrLast4: "7842",
      bookingDate: "2025-09-04 20:15",
      items: [
        { name: "Veg Thali", qty: 1, price: 250 },
        { name: "Water 1L", qty: 1, price: 30 },
        { name: "Paneer Roll", qty: 1, price: 120 },
      ],
    },
  ], []);
  const [open, setOpen] = useState<Order|null>(null);

  return (
    <main className="mx-auto w-full max-w-screen-md p-4">
      <h1 className="text-xl font-semibold mb-3">My Orders</h1>
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

      {open && <OrderDetailsModal order={open} onClose={()=>setOpen(null)} />}
    </main>
  );
}
