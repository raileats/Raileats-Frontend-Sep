"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "../lib/useCart";
import { priceStr } from "../lib/priceUtil";

export default function CheckoutPage() {
  const { lines, count, total, changeQty, remove, clearCart } = useCart();

  const [pnr, setPnr] = useState("");
  const [coach, setCoach] = useState("");
  const [seat, setSeat] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");

  const canPlace =
    count > 0 &&
    pnr.trim().length >= 6 &&
    coach.trim().length >= 1 &&
    seat.trim().length >= 1 &&
    name.trim().length >= 2 &&
    /^\d{10}$/.test(mobile.trim());

  function placeOrder() {
    if (!canPlace) return;
    alert(`Order placed!\nItems: ${count}\nSubtotal: ${priceStr(total)}`);
    clearCart();
  }

  const items = useMemo(() => lines || [], [lines]);

  return (
    <main className="site-container page-safe-bottom">
      {/* === Compact header with top-right actions === */}
      <div className="checkout-header-actions">
        <h1>Items</h1>
        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (typeof window !== "undefined") window.history.back();
              }}
              className="rounded border px-3 py-1 text-sm"
            >
              Add More
            </button>
            <button
              onClick={placeOrder}
              disabled={!canPlace}
              className={`rounded px-3 py-1 text-sm text-white ${
                canPlace ? "bg-green-600" : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Checkout
            </button>
          </div>
        )}
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
          {/* Cart items */}
          <section
            className="md:col-span-2 card-safe"
            style={{
              maxHeight:
                "calc(100vh - (var(--nav-h,64px) + var(--bottom-h,56px) + 120px))",
              overflow: "auto",
            }}
          >
            <div className="space-y-3">
              {items.map((line) => (
                <div
                  key={line.id}
                  className="w-full border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-base break-words">
                        {line.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 sm:mt-0">
                        {priceStr(line.price)} × {line.qty}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:flex-shrink-0 sm:flex-col sm:items-end">
                      <div className="inline-flex items-center border rounded overflow-hidden">
                        <button
                          className="px-2 py-1 text-sm"
                          onClick={() =>
                            changeQty(line.id, Math.max(0, line.qty - 1))
                          }
                        >
                          −
                        </button>
                        <span className="px-3 py-1 border-l border-r text-sm">
                          {line.qty}
                        </span>
                        <button
                          className="px-2 py-1 text-sm"
                          onClick={() => changeQty(line.id, line.qty + 1)}
                        >
                          +
                        </button>
                      </div>
                      <div className="w-24 text-right font-medium text-base">
                        {priceStr(line.price * line.qty)}
                      </div>
                      <button
                        className="text-rose-600 text-sm"
                        onClick={() => remove(line.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-3 border-t flex items-center justify-between">
                <div className="font-semibold">Subtotal</div>
                <div className="font-semibold">{priceStr(total)}</div>
              </div>

              <button
                type="button"
                className="text-sm text-gray-600 underline"
                onClick={clearCart}
              >
                Clear cart
              </button>
            </div>
          </section>

          {/* Journey details */}
          <aside className="card-safe">
            <h2 className="font-semibold mb-3">Journey Details</h2>

            <div className="space-y-3">
              <div>
                <label className="text-sm block mb-1">PNR</label>
                <input
                  className="input"
                  value={pnr}
                  onChange={(e) => setPnr(e.target.value)}
                  placeholder="10-digit PNR"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm block mb-1">Coach</label>
                  <input
                    className="input"
                    value={coach}
                    onChange={(e) => setCoach(e.target.value)}
                    placeholder="e.g. B3"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm block mb-1">Seat</label>
                  <input
                    className="input"
                    value={seat}
                    onChange={(e) => setSeat(e.target.value)}
                    placeholder="e.g. 42"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm block mb-1">Name</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Passenger name"
                />
              </div>

              <div>
                <label className="text-sm block mb-1">Mobile</label>
                <input
                  className="input"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10-digit mobile"
                  inputMode="numeric"
                />
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
