"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { priceStr } from "../../lib/priceUtil";

export default function ReviewPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<any | null>(null);

  const [platformCharge, setPlatformCharge] = useState<number>(20); // default charge
  const gstPercent = 5;
  const [mode, setMode] = useState<"cod" | "online">("cod");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem("raileats_order_draft");
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

  // 🔹 COD order ko backend (/api/orders) par POST karo
  const placeCodOrder = async () => {
    if (placing) return;
    setPlacing(true);
    try {
      const journey = draft.journey || {};
      const meta = draft.meta || {};

      if (!meta.restroCode) {
        alert("Restaurant information missing. Please start from station page again.");
        setPlacing(false);
        return;
      }

      const payload = {
        restro_code: meta.restroCode,
        customer: {
          full_name: String(journey.name || "").trim(),
          phone: String(journey.mobile || "").trim(),
        },
        delivery: {
          train_no: String(journey.pnr || "").trim(),
          coach: String(journey.coach || "").trim(),
          seat: String(journey.seat || "").trim(),
          // aap future me date/time choose karwaoge to yahan bhej dena
        },
        pricing: {
          subtotal,
          gst,
          platform_charge: platformCharge,
          total: final,
          payment_mode: "COD",
        },
        items: (draft.items || []).map((it: any) => ({
          item_id: it.id,
          name: it.name,
          qty: it.qty,
          base_price: it.price,
          line_total: (it.price || 0) * (it.qty || 1),
        })),
        meta: {
          journey,
          stationCode: meta.stationCode || null,
          stationName: meta.stationName || null,
          outletName: meta.outletName || null,
          draftId: draft.id || null,
        },
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok || !json?.ok) {
        console.error("Order POST failed", res.status, json);
        alert("Order booking failed. Please try again.");
        setPlacing(false);
        return;
      }

      const orderId = json.order_id || json.id || "ORD" + Date.now();

      const summaryOrder = {
        id: orderId,
        items: draft.items,
        journey,
        subtotal,
        gst,
        platformCharge,
        total: final,
        paymentMode: "COD",
        createdAt: Date.now(),
      };

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "raileats_last_order",
          JSON.stringify(summaryOrder),
        );
        window.sessionStorage.removeItem("raileats_order_draft");
      }

      router.push("/checkout/summary");
    } catch (e) {
      console.error("placeCodOrder error", e);
      alert("Something went wrong while booking the order.");
      setPlacing(false);
    }
  };

  const gotoPayOnline = () => {
    // future: yahan bhi API hit kar sakte ho, abhi purana flow hi rehne de
    const payload = { draft, platformCharge, gstPercent, gst, final };
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "raileats_payment_payload",
        JSON.stringify(payload),
      );
    }
    router.push("/checkout/payment");
  };

  return (
    <main className="site-container page-safe-bottom">
      <h1 className="text-2xl font-bold mb-2">Review Order</h1>

      <div className="card-safe mb-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-sm text-gray-600">To</div>
            <div className="font-medium">{draft.journey?.name}</div>
            <div className="text-xs text-gray-500">
              {draft.journey?.pnr} • Coach {draft.journey?.coach} • Seat{" "}
              {draft.journey?.seat}
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
              disabled={placing}
            >
              {placing ? "Booking…" : "Book"}
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
