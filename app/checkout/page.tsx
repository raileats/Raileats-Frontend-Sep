// app/checkout/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "../lib/useCart";
import { priceStr } from "../lib/priceUtil";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, count, total, changeQty, remove, clearCart } = useCart();

  const [pnr, setPnr] = useState("");
  const [coach, setCoach] = useState("");
  const [seat, setSeat] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");

  const canProceed =
    count > 0 &&
    pnr.trim().length >= 6 &&
    coach.trim().length >= 1 &&
    seat.trim().length >= 1 &&
    name.trim().length >= 2 &&
    /^\d{10}$/.test(mobile.trim());

  const items = useMemo(() => lines || [], [lines]);

  // ➜ जब user Next दबाए, तो एक order-draft बनाकर sessionStorage में रखें
  //   और /checkout/review पर redirect कर दें (आपका review page वही handle करेगा)
  function goToReview() {
    if (!canProceed) {
      // Hindi message for user
      alert("कृपया PNR, Coach, Seat, Name और 10-digit Mobile सही भरें।");
      return;
    }

    const draft = {
      id: "DRAFT_" + Date.now(),
      items: items.map((l) => ({ id: l.id, name: l.name, price: l.price, qty: l.qty })),
      count,
      subtotal: total,
      journey: { pnr: pnr.trim(), coach: coach.trim(), seat: seat.trim(), name: name.trim(), mobile: mobile.trim() },
      createdAt: Date.now(),
    };

    if (typeof window !== "undefined") {
      sessionStorage.setItem("raileats_order_draft", JSON.stringify(draft));
    }

    router.push("/checkout/review");
  }

  return (
    <main className="site-container page-safe-bottom">
      <div className="checkout-header-actions" style={{ marginBottom: ".6rem" }}>
        <div>
          <h1 className="text-2xl font-bold">Checkout</h1>
          <p className="text-sm text-gray-600 mt-1">Review items & journey details</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card-safe">
          <p className="text-sm text-gray-600">
            Your cart is empty.{" "}
            <Link href="/" className="text-blue-600 underline">
              Continue shopping
            </Link>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ITEMS */}
          <section
            className="md:col-span-2 card-safe"
            aria-label="Cart items"
            style={{ maxHeight: "calc(100vh - (var(--nav-h,64px) + var(--bottom-h,56px) + 140px))", overflow: "auto" }}
          >
            <div className="space-y-3">
              {items.map((line) => (
                <div key={line.id} className="w-full border-b pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="font-medium text-base truncate" title={line.name} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {line.name}
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        <div className="inline-flex items-center border rounded overflow-hidden" role="group" aria-label={`Quantity controls for ${line.name}`}>
                          <button className="px-2 py-1 text-sm" onClick={() => changeQty(line.id, Math.max(0, line.qty - 1))}>−</button>
                          <span className="px-3 py-1 border-l border-r text-sm">{line.qty}</span>
                          <button className="px-2 py-1 text-sm" onClick={() => changeQty(line.id, line.qty + 1)}>+</button>
                        </div>

                        <div className="text-xs text-gray-500">{priceStr(line.price)} × {line.qty}</div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end flex-shrink-0">
                      <div className="font-medium text-base">{priceStr(line.price * line.qty)}</div>
                      <button className="text-rose-600 text-sm mt-2" onClick={() => remove(line.id)}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-3 border-t flex items-center justify-between">
                <div className="font-semibold">Subtotal</div>
                <div className="font-semibold">{priceStr(total)}</div>
              </div>

              <div className="mt-2">
                <button className="text-sm text-gray-600 underline" onClick={clearCart}>Clear cart</button>
              </div>
            </div>
          </section>

          {/* JOURNEY */}
          <aside className="card-safe checkout-card">
            <h2 className="font-semibold mb-3">Journey Details</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm block mb-1">PNR</label>
                <input className="input" value={pnr} onChange={(e) => setPnr(e.target.value)} placeholder="10-digit or 6+ chars" />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm block mb-1">Coach</label>
                  <input className="input" value={coach} onChange={(e) => setCoach(e.target.value)} placeholder="e.g. B3" />
                </div>
                <div className="flex-1">
                  <label className="text-sm block mb-1">Seat</label>
                  <input className="input" value={seat} onChange={(e) => setSeat(e.target.value)} placeholder="e.g. 42" />
                </div>
              </div>

              <div>
                <label className="text-sm block mb-1">Name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Passenger name" />
              </div>

              <div>
                <label className="text-sm block mb-1">Mobile</label>
                <input className="input" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="10-digit mobile" inputMode="numeric" />
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* bottom panel normal block (not fixed) */}
      {items.length > 0 && (
        <div className="bottom-action-elevated" style={{ width: "min(1024px, calc(100% - 2rem))", margin: "1rem auto", padding: ".6rem", boxSizing: "border-box", borderRadius: 10, background: "#fff", marginBottom: "calc(var(--bottom-h) + 12px)" }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-gray-600">Subtotal</div>
              <div className="font-semibold">{priceStr(total)}</div>
            </div>

            <div className="flex items-center gap-3">
              <button className="rounded border px-3 py-2 text-sm" onClick={() => (typeof window !== "undefined" ? window.history.back() : null)}>Add More Items</button>

              <button className={`rounded px-4 py-2 text-sm text-white ${canProceed ? "bg-green-600" : "bg-gray-400 cursor-not-allowed"}`} onClick={goToReview} disabled={!canProceed}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
