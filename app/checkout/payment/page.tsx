"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { priceStr } from "../../lib/priceUtil";

export default function PaymentPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<any>(null);
  const [method, setMethod] = useState<"upi" | "card">("upi");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("raileats_payment_payload");
    if (!raw) {
      router.replace("/checkout");
      return;
    }
    setPayload(JSON.parse(raw));
  }, [router]);

  if (!payload) return <main className="site-container page-safe-bottom card-safe">Loading…</main>;

  const onPay = () => {
    // In real app: call payment gateway, handle redirect / callback
    // Here: simulate success and save order
    const order = {
      id: "ORD" + Date.now(),
      items: payload.draft.items,
      journey: payload.draft.journey,
      subtotal: payload.draft.subtotal,
      gst: payload.gst,
      platformCharge: payload.platformCharge,
      total: payload.final,
      paymentMode: method === "upi" ? "Online-UPI" : "Online-Card",
      createdAt: Date.now(),
    };
    sessionStorage.setItem("raileats_last_order", JSON.stringify(order));
    sessionStorage.removeItem("raileats_order_draft");
    sessionStorage.removeItem("raileats_payment_payload");
    // navigate to order summary (mock)
    router.push("/checkout/summary");
  };

  return (
    <main className="site-container page-safe-bottom">
      <h1 className="text-2xl font-bold mb-3">Payment</h1>

      <div className="card-safe mb-4">
        <div className="flex justify-between">
          <div>Total</div>
          <div className="font-semibold">{priceStr(payload.final)}</div>
        </div>
      </div>

      <div className="card-safe mb-4">
        <label className="flex items-center gap-2 mb-2">
          <input type="radio" checked={method === "upi"} onChange={() => setMethod("upi")} />
          <div>
            <div className="font-medium">UPI</div>
            <div className="text-xs text-gray-500">Pay using any UPI app</div>
          </div>
        </label>

        <label className="flex items-center gap-2 mb-2">
          <input type="radio" checked={method === "card"} onChange={() => setMethod("card")} />
          <div>
            <div className="font-medium">Debit / Credit Card</div>
            <div className="text-xs text-gray-500">Pay with card</div>
          </div>
        </label>

        <div className="mt-3 flex gap-3">
          <button className="rounded px-4 py-2 bg-blue-600 text-white" onClick={onPay}>Pay now</button>
          <button className="rounded border px-4 py-2" onClick={() => router.back()}>Back</button>
        </div>
      </div>
    </main>
  );
}
