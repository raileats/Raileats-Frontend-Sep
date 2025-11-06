// app/checkout/summary/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { priceStr } from "../../../lib/priceUtil";
import { useRouter } from "next/navigation";

export default function OrderSummary() {
  const [order, setOrder] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("raileats_last_order");
    if (!raw) {
      router.replace("/");
      return;
    }
    setOrder(JSON.parse(raw));
  }, [router]);

  if (!order) return <main className="site-container page-safe-bottom card-safe">Loading…</main>;

  return (
    <main className="site-container page-safe-bottom">
      <h1 className="text-2xl font-bold mb-3">Order placed</h1>

      <div className="card-safe mb-4">
        <div className="text-sm text-gray-600">Order ID</div>
        <div className="font-semibold mb-2">{order.id}</div>

        <div className="text-sm text-gray-600">Payment</div>
        <div className="mb-2 font-medium">{order.paymentMode}</div>

        <div className="text-sm text-gray-600">Journey</div>
        <div className="mb-2">{order.journey.name} • {order.journey.pnr} • Coach {order.journey.coach} Seat {order.journey.seat}</div>

        <div className="text-sm text-gray-600">Items</div>
        <ul className="mb-2">
          {order.items.map((it: any, i: number) => (
            <li key={i} className="flex justify-between">
              <div>{it.name} × {it.qty}</div>
              <div>{priceStr(it.price * it.qty)}</div>
            </li>
          ))}
        </ul>

        <div className="pt-2 border-t flex justify-between font-semibold">
          <div>Total</div>
          <div>{priceStr(order.total)}</div>
        </div>
      </div>
    </main>
  );
}
