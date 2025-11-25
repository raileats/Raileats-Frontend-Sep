"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { priceStr } from "../../lib/priceUtil";

const ADMIN_SYNC_PATH = "/api/orders";

type Draft = {
  id: string;
  items: { id: number; name: string; price: number; qty: number }[];
  count: number;
  subtotal: number;
  journey: {
    pnr: string;
    coach: string;
    seat: string;
    name: string;
    mobile: string;
  };
  meta?: any;
  createdAt: number;
};

async function syncOrderToSupabase(
  draft: Draft,
  opts: { subtotal: number; gst: number; platformCharge: number; total: number },
): Promise<string | null> {
  const meta = draft.meta || {};
  const restroCode =
    meta.restroCode ??
    meta.restroCode ??
    meta.RestroCode ??
    meta.restro_code ??
    null;

  if (!restroCode) {
    console.warn("No restroCode in draft.meta, skipping Supabase sync");
    return null;
  }

  try {
    const payload = {
      restro_code: restroCode,
      customer: {
        full_name: draft.journey.name,
        phone: draft.journey.mobile,
      },
      delivery: {
        train_no: draft.journey.pnr || "NA",
        coach: draft.journey.coach,
        seat: draft.journey.seat,
        note: null as string | null,
      },
      pricing: {
        subtotal: opts.subtotal,
        gst: opts.gst,
        platform_charge: opts.platformCharge,
        total: opts.total,
        payment_mode: "ONLINE",
      },
      items: draft.items.map((it) => ({
        item_id: it.id,
        name: it.name,
        qty: it.qty,
        base_price: it.price,
        line_total: it.price * it.qty,
      })),
      meta: draft,
    };

    const res = await fetch(ADMIN_SYNC_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json: any = await res.json().catch(() => ({}));
    if (res.ok && json?.ok && json.order_id) {
      return String(json.order_id);
    }

    console.error("Supabase ONLINE order sync failed", res.status, json);
    return null;
  } catch (e) {
    console.error("Supabase ONLINE order sync error", e);
    return null;
  }
}

export default function PaymentPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<{
    draft: Draft;
    platformCharge: number;
    gstPercent: number;
    gst: number;
    final: number;
  } | null>(null);
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

  if (!payload)
    return (
      <main className="site-container page-safe-bottom card-safe">
        Loading…
      </main>
    );

  const { draft, platformCharge, gst, final } = payload;

  const onPay = async () => {
    const paymentLabel =
      method === "upi" ? "Online-UPI" : "Online-Card";

    // Pehle Supabase / Orders ko sync
    const adminOrderId = await syncOrderToSupabase(draft, {
      subtotal: draft.subtotal,
      gst,
      platformCharge,
      total: final,
    });

    const localId = "ORD" + Date.now();
    const displayId = adminOrderId || localId;

    const order = {
      id: displayId,
      adminOrderId,
      localOrderId: localId,
      items: draft.items,
      journey: draft.journey,
      subtotal: draft.subtotal,
      gst,
      platformCharge,
      total: final,
      paymentMode: paymentLabel,
      createdAt: Date.now(),
    };

    sessionStorage.setItem("raileats_last_order", JSON.stringify(order));
    sessionStorage.removeItem("raileats_order_draft");
    sessionStorage.removeItem("raileats_payment_payload");
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
          <input
            type="radio"
            checked={method === "upi"}
            onChange={() => setMethod("upi")}
          />
          <div>
            <div className="font-medium">UPI</div>
            <div className="text-xs text-gray-500">
              Pay using any UPI app
            </div>
          </div>
        </label>

        <label className="flex items-center gap-2 mb-2">
          <input
            type="radio"
            checked={method === "card"}
            onChange={() => setMethod("card")}
          />
          <div>
            <div className="font-medium">Debit / Credit Card</div>
            <div className="text-xs text-gray-500">Pay with card</div>
          </div>
        </label>

        <div className="mt-3 flex gap-3">
          <button
            className="rounded px-4 py-2 bg-blue-600 text-white"
            onClick={onPay}
          >
            Pay now
          </button>
          <button
            className="rounded border px-4 py-2"
            onClick={() => router.back()}
          >
            Back
          </button>
        </div>
      </div>
    </main>
  );
}
