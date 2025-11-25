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
  meta?: any; // yahan se restroCode, stationCode, etc. aayega
  createdAt: number;
};

async function syncOrderToSupabase(
  draft: Draft,
  opts: { subtotal: number; gst: number; platformCharge: number; total: number; paymentMode: "COD" | "ONLINE" },
): Promise<string | null> {
  // restroCode ko meta se nikaalo (different possible field names)
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
        // abhi humare paas real train no. nahi, isliye PNR / "NA" bhej rahe hain
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
        payment_mode: opts.paymentMode, // "COD" | "ONLINE"
      },
      items: draft.items.map((it) => ({
        item_id: it.id,
        name: it.name,
        qty: it.qty,
        base_price: it.price,
        line_total: it.price * it.qty,
      })),
      meta: draft, // full draft ko meta me bhej rahe hain
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

    console.error("Supabase order sync failed", res.status, json);
    return null;
  } catch (e) {
    console.error("Supabase order sync error", e);
    return null;
  }
}

export default function ReviewPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);

  const [platformCharge, setPlatformCharge] = useState<number>(20); // default charge
  const gstPercent = 5;
  const [mode, setMode] = useState<"cod" | "online">("cod");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("raileats_order_draft");
    if (!raw) {
      router.replace("/checkout");
      return;
    }
    try {
      setDraft(JSON.parse(raw));
    } catch (e) {
      console.error("Invalid draft in sessionStorage", e);
      router.replace("/checkout");
    }
  }, [router]);

  if (!draft)
    return (
      <main className="site-container page-safe-bottom card-safe">
        Loading…
      </main>
    );

  const subtotal = Number(draft.subtotal || 0);
  const gst = +(subtotal * (gstPercent / 100));
  const final = +(subtotal + gst + Number(platformCharge || 0));

  const placeCodOrder = async () => {
    // pehle Supabase / admin ko hit karo
    const adminOrderId = await syncOrderToSupabase(draft, {
      subtotal,
      gst,
      platformCharge,
      total: final,
      paymentMode: "COD",
    });

    const localId = "ORD" + Date.now();
    const displayId = adminOrderId || localId;

    const order = {
      id: displayId, // summary me yehi dikhega
      adminOrderId,
      localOrderId: localId,
      items: draft.items,
      journey: draft.journey,
      subtotal,
      gst,
      platformCharge,
      total: final,
      paymentMode: "COD",
      createdAt: Date.now(),
    };

    sessionStorage.setItem("raileats_last_order", JSON.stringify(order));
    sessionStorage.removeItem("raileats_order_draft");
    router.push("/checkout/summary");
  };

  const gotoPayOnline = () => {
    const payload = { draft, platformCharge, gstPercent, gst, final };
    sessionStorage.setItem(
      "raileats_payment_payload",
      JSON.stringify(payload),
    );
    router.push("/checkout/payment");
  };

  return (
    <main className="site-container page-safe-bottom">
      <h1 className="text-2xl font-bold mb-2">Review Order</h1>

      <div className="card-safe mb-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-sm text-gray-600">To</div>
            <div className="font-medium">{draft.journey.name}</div>
            <div className="text-xs text-gray-500">
              {draft.journey.pnr} • Coach {draft.journey.coach} • Seat{" "}
              {draft.journey.seat}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-600">Items</div>
            <div className="font-medium">{draft.count}</div>
          </div>
        </div>
      </div>

      <div className="card-safe mb-4">
        <h3 className="font-semibold mb-2">Price details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <div>Base price</div>
            <div>{priceStr(subtotal)}</div>
          </div>
          <div className="flex justify-between">
            <div>GST ({gstPercent}%)</div>
            <div>{priceStr(gst)}</div>
          </div>
          <div className="flex justify-between items-center">
            <div>Platform / delivery</div>
            <div>
              <input
                type="number"
                value={platformCharge}
                onChange={(e) =>
                  setPlatformCharge(Number(e.target.value || 0))
                }
                className="input"
                style={{ width: 110 }}
              />
            </div>
          </div>
          <div className="pt-2 border-t flex justify-between font-semibold">
            <div>Total</div>
            <div>{priceStr(final)}</div>
          </div>
        </div>
      </div>

      <div className="card-safe mb-4">
        <h3 className="font-semibold mb-2">Payment</h3>

        <label className="flex items-center gap-2 mb-2">
          <input
            type="radio"
            checked={mode === "cod"}
            onChange={() => setMode("cod")}
          />
          <span>Cash on delivery (COD)</span>
        </label>

        <label className="flex items-center gap-2 mb-2">
          <input
            type="radio"
            checked={mode === "online"}
            onChange={() => setMode("online")}
          />
          <span>Pay Online</span>
        </label>

        {mode === "cod" ? (
          <div className="mt-3 flex gap-3">
            <button
              className="rounded px-4 py-2 bg-green-600 text-white"
              onClick={placeCodOrder}
            >
              Book
            </button>
            <button
              className="rounded border px-4 py-2"
              onClick={() => router.back()}
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="mt-3 flex gap-3">
            <button
              className="rounded px-4 py-2 bg-blue-600 text-white"
              onClick={gotoPayOnline}
            >
              Pay now
            </button>
            <button
              className="rounded border px-4 py-2"
              onClick={() => router.back()}
            >
              Edit
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
