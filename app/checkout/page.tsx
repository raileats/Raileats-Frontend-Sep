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
    alert(
      `Order placed!\nItems: ${count}\nSubtotal: ${priceStr(total)}\nPNR: ${pnr}, Coach: ${coach}, Seat: ${seat}`
    );
    clearCart();
  }

  // Make lines stable for rendering
  const items = useMemo(() => lines || [], [lines]);

  return (
    // site-container + main-content are expected from your globals/layout
    <main className="site-container page-safe-bottom">
      <div className="pt-4 pb-6">
        <h1 className="text-2xl font-bold mb-2">Checkout</h1>

        {items.length === 0 ? (
          <div className="mt-4 card-safe">
            <p className="text-sm text-gray-600">
              Your cart is empty.{" "}
              <Link href="/" className="text-blue-600 underline">
                Continue shopping
              </Link>
            </p>
          </div>
        ) : (
          // Grid layout: items (left) / details (right) on md+, stacked on mobile
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Items column */}
            <section
              className="md:col-span-2 card-safe"
              // allow this column to scroll if very tall but keep safe space for bottom action
              style={{
                maxHeight:
                  "calc(100vh - (var(--nav-h,64px) + var(--bottom-h,56px) + 180px))",
                overflow: "auto",
              }}
            >
              <h2 className="font-semibold mb-3">Items</h2>

              <div className="space-y-3">
                {items.map((line) => (
                  <div key={line.id} className="flex items-center justify-between">
                    <div className="min-w-0 pr-3">
                      <div className="font-medium truncate">{line.name}</div>
                      <div className="text-xs text-gray-500">
                        {priceStr(line.price)} × {line.qty}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center border rounded overflow-hidden">
                        <button
                          className="px-3 py-2"
                          onClick={() => changeQty(line.id, Math.max(0, line.qty - 1))}
                          aria-label="Decrease"
                        >
                          −
                        </button>
                        <span className="px-4 py-2 border-l border-r">{line.qty}</span>
                        <button
                          className="px-3 py-2"
                          onClick={() => changeQty(line.id, line.qty + 1)}
                          aria-label="Increase"
                        >
                          +
                        </button>
                      </div>

                      <div className="w-20 text-right font-medium">{priceStr(line.price * line.qty)}</div>

                      <button
                        className="text-rose-600 text-sm ml-2"
                        onClick={() => remove(line.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                <div className="pt-3 border-t flex items-center justify-between">
                  <div className="font-semibold">Subtotal</div>
                  <div className="font-semibold">{priceStr(total)}</div>
                </div>

                <div className="mt-2">
                  <button
                    type="button"
                    className="text-sm text-gray-600 underline"
                    onClick={() => clearCart()}
                  >
                    Clear cart
                  </button>
                </div>
              </div>
            </section>

            {/* Journey / customer details */}
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

                {/* On desktop this button is regular block; on mobile we'll also present a fixed action row (below) */}
                <div className="hidden md:block">
                  <button
                    type="button"
                    className={`w-full mt-2 rounded py-2 text-white ${canPlace ? "bg-green-600" : "bg-gray-400 cursor-not-allowed"}`}
                    disabled={!canPlace}
                    onClick={placeOrder}
                  >
                    Place Order
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Taxes, platform fee & delivery (if any) show on next screen.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* ===== Mobile fixed action row (keeps above bottom nav) =====
          - visible only on small screens (md:hidden)
          - lives above bottom nav using calc(var(--bottom-h) + 10px)
          - small vertical lift so it doesn't sit flush against bottom nav
      */}
      {items.length > 0 && (
        <div
          className="md:hidden fixed left-0 right-0 px-4"
          style={{
            bottom: `calc(var(--bottom-h,56px) + 10px)`,
            zIndex: 60,
          }}
        >
          <div className="bg-white rounded-lg p-3 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm text-gray-600">Subtotal</div>
                <div className="font-semibold">{priceStr(total)}</div>
              </div>
              <div className="w-1/2 flex gap-2">
                <button
                  onClick={() => {
                    // go back to menu (history back works if user came from there)
                    if (typeof window !== "undefined") window.history.back();
                  }}
                  className="flex-1 rounded border py-2"
                >
                  Add More Items
                </button>

                <button
                  onClick={placeOrder}
                  disabled={!canPlace}
                  className={`flex-1 rounded py-2 text-white ${canPlace ? "bg-green-600" : "bg-gray-400 cursor-not-allowed"}`}
                >
                  Checkout
                </button>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Taxes, platform fee & delivery (if any) show on next screen.
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
