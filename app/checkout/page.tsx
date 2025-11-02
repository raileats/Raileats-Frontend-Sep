"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "../lib/useCart";
import { priceStr } from "../lib/priceUtil";

export default function CheckoutPage() {
  const { cart, lines, count, total, changeQty, remove, clearCart } = useCart();

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
    // TODO: integrate actual order API here
    alert(
      `Order placed!\nItems: ${count}\nSubtotal: ${priceStr(total)}\nPNR: ${pnr}, Coach: ${coach}, Seat: ${seat}`
    );
    clearCart();
  }

  return (
    <main className="max-w-3xl mx-auto px-3 sm:px-6 py-6">
      <h1 className="text-2xl font-bold">Checkout</h1>

      {count === 0 ? (
        <div className="mt-4 bg-white rounded border p-4">
          <p className="text-sm text-gray-600">
            Your cart is empty.{" "}
            <Link className="text-blue-600 underline" href="/">
              Continue shopping
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-4 grid md:grid-cols-3 gap-4">
          {/* Cart items */}
          <section className="md:col-span-2 bg-white rounded border p-4">
            <h2 className="font-semibold mb-3">Items</h2>
            <div className="space-y-3">
              {lines.map((line) => (
                <div key={line.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{line.name}</div>
                    <div className="text-xs text-gray-500">
                      {priceStr(line.price)} × {line.qty}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center border rounded overflow-hidden">
                      <button
                        className="px-2 py-1"
                        onClick={() => changeQty(line.id, line.qty - 1)}
                      >
                        −
                      </button>
                      <span className="px-3 py-1 border-l border-r">{line.qty}</span>
                      <button
                        className="px-2 py-1"
                        onClick={() => changeQty(line.id, line.qty + 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="w-20 text-right font-medium">
                      {priceStr(line.qty * line.price)}
                    </div>
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
              <button
                type="button"
                className="text-sm text-gray-600 underline"
                onClick={clearCart}
              >
                Clear cart
              </button>
            </div>
          </section>

          {/* Details */}
          <aside className="bg-white rounded border p-4">
            <h2 className="font-semibold mb-3">Journey Details</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm">PNR</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={pnr}
                  onChange={(e) => setPnr(e.target.value)}
                  placeholder="10-digit PNR"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm">Coach</label>
                  <input
                    className="mt-1 w-full rounded border px-3 py-2"
                    value={coach}
                    onChange={(e) => setCoach(e.target.value)}
                    placeholder="e.g. B3"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm">Seat</label>
                  <input
                    className="mt-1 w-full rounded border px-3 py-2"
                    value={seat}
                    onChange={(e) => setSeat(e.target.value)}
                    placeholder="e.g. 42"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm">Name</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Passenger name"
                />
              </div>
              <div>
                <label className="text-sm">Mobile</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10-digit mobile"
                  inputMode="numeric"
                />
              </div>

              <button
                type="button"
                className={`w-full mt-2 rounded py-2 text-white ${canPlace ? "bg-green-600" : "bg-gray-400 cursor-not-allowed"}`}
                disabled={!canPlace}
                onClick={placeOrder}
              >
                Place Order
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Taxes, platform fee & delivery (if any) show on next screen.
              </p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
