// app/checkout/summary/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { priceStr } from "../../lib/priceUtil"; // ← CORRECTED PATH

export default function SummaryPage() {
  const router = useRouter();
  const [order, setOrder] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("raileats_last_order");
    if (!raw) {
      router.replace("/"); // nothing to show
      return;
    }
    try {
      setOrder(JSON.parse(raw));
    } catch (e) {
      console.error("Invalid last order", e);
      router.replace("/");
    }
  }, [router]);

  if (!order) return <main className="site-container page-safe-bottom card-safe">Loading…</main>;

  return (
    <main className="site-container page-safe-bottom">
      <h1 className="text-2xl font-bold mb-2">Order Confirmed</h1>

      <div className="card-safe mb-4">
        <div className="flex justify-between">
          <div>
            <div className="text-sm text-gray-600">Order ID</div>
            <div className="font-medium">{order.id}</div>
            <div className="text-xs text-gray-500">Placed: {new Date(order.createdAt).toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Payment</div>
            <div className="font-medium">{order.paymentMode}</div>
          </div>
        </div>
      </div>

      <div className="card-safe mb-4">
        <h3 className="font-semibold mb-2">Items</h3>
        <div className="space-y-2">
          {Array.isArray(order.items) && order.items.map((it: any, idx: number) => (
            <div key={idx} className="flex justify-between">
              <div>{it.name} × {it.qty}</div>
              <div>{priceStr((it.price || 0) * (it.qty || 1))}</div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t mt-3 space-y-1">
          <div className="flex justify-between text-sm"><div>Subtotal</div><div>{priceStr(order.subtotal)}</div></div>
          <div className="flex justify-between text-sm"><div>GST</div><div>{priceStr(order.gst)}</div></div>
          <div className="flex justify-between text-sm"><div>Platform/Delivery</div><div>{priceStr(order.platformCharge)}</div></div>
          <div className="flex justify-between font-semibold pt-2"><div>Total</div><div>{priceStr(order.total)}</div></div>
        </div>
      </div>

      <div className="card-safe">
        <h3 className="font-semibold mb-2">Journey</h3>
        <div className="text-sm">
          <div>{order.journey?.name}</div>
          <div className="text-xs text-gray-500">{order.journey?.pnr} • Coach {order.journey?.coach} • Seat {order.journey?.seat}</div>
          <div className="mt-2 text-sm">Mobile: {order.journey?.mobile || "—"}</div>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button className="rounded border px-4 py-2" onClick={() => router.push("/")}>Continue</button>
        <button className="rounded px-4 py-2 bg-blue-600 text-white" onClick={() => { /* could open invoice */ }}>Download Invoice</button>
      </div>
    </main>
  );
}
