"use client";

import React, { useEffect, useState } from "react";
import { useCart } from "../lib/useCart";
import { onOpenCart, onCloseCart } from "../lib/cartEvents";
import { useRouter } from "next/navigation";

export default function CartPopup() {
  const { items, total, increaseQty, decreaseQty } = useCart();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const offOpen = onOpenCart(() => setOpen(true));
    const offClose = onCloseCart(() => setOpen(false));
    return () => {
      offOpen();
      offClose();
    };
  }, []);

  if (!open || items.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">

      {/* MAIN BOX */}
     <div className="bg-white w-full md:w-[380px] max-max-h-[80vh] h-auto rounded-t-xl md:rounded-xl shadow-xl flex flex-col">

        {/* HEADER */}
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <h2 className="font-semibold">Your Cart</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-lg"
          >
            ×
          </button>
        </div>

        {/* ITEMS (SCROLLABLE) */}
       <div className="overflow-y-auto px-4 py-3 space-y-3 max-h-[55vh]">
          {items.map((it) => (
            <div key={it.id} className="flex justify-between items-center">

              {/* LEFT */}
              <div className="flex-1">
                <p className="font-medium">{it.name}</p>
                <p className="text-xs text-gray-500">₹{it.price}</p>
              </div>

              {/* QTY */}
              <div className="flex items-center gap-2 border rounded px-2 py-1">
                <button onClick={() => decreaseQty(it.id)}>-</button>
                <span>{it.qty}</span>
                <button onClick={() => increaseQty(it.id)}>+</button>
              </div>

              {/* PRICE */}
              <div className="w-16 text-right font-medium">
                ₹{it.price * it.qty}
              </div>

            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="border-t p-4">
"use client";

import React, { useEffect, useState } from "react";
import { useCart } from "../lib/useCart";
import { onOpenCart, onCloseCart } from "../lib/cartEvents";
import { useRouter } from "next/navigation";

export default function CartPopup() {
  const { items, total, increaseQty, decreaseQty } = useCart();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const offOpen = onOpenCart(() => setOpen(true));
    const offClose = onCloseCart(() => setOpen(false));
    return () => {
      offOpen();
      offClose();
    };
  }, []);

  if (!open || items.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">

      {/* MAIN CONTAINER */}
      <div className="bg-white w-full md:w-[380px] h-[80vh] rounded-t-2xl md:rounded-xl shadow-xl flex flex-col">

        {/* DRAG HANDLE (optional but nice) */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2 mb-2"></div>

        {/* HEADER */}
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <h2 className="font-semibold text-base">Your Cart</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-lg"
          >
            ×
          </button>
        </div>

        {/* ITEMS (ONLY THIS SCROLLS) */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between">

              {/* LEFT */}
              <div className="flex-1 pr-2">
                <p className="font-medium text-sm">{it.name}</p>
                <p className="text-xs text-gray-500">₹{it.price}</p>
              </div>

              {/* QTY CONTROL */}
              <div className="flex items-center gap-2 border rounded px-2 py-1">
                <button
                  onClick={() => decreaseQty(it.id)}
                  className="px-2"
                >
                  -
                </button>

                <span className="min-w-[20px] text-center">
                  {it.qty}
                </span>

                <button
                  onClick={() => increaseQty(it.id)}
                  className="px-2"
                >
                  +
                </button>
              </div>

              {/* PRICE */}
              <div className="w-16 text-right font-medium text-sm">
                ₹{it.price * it.qty}
              </div>

            </div>
          ))}

        </div>

        {/* FOOTER (FIXED ALWAYS VISIBLE) */}
        <div className="border-t p-4 bg-white shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">

          <div className="flex justify-between mb-3 font-semibold">
            <span>Total</span>
            <span>₹{total}</span>
          </div>

          <button
            onClick={() => {
              setOpen(false);
              router.push("/checkout");
            }}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium"
          >
            Proceed to Checkout
          </button>

        </div>

      </div>
    </div>
  );
}
          <div className="flex justify-between mb-3 font-semibold">
            <span>Total</span>
            <span>₹{total}</span>
          </div>

          <button
            onClick={() => {
              setOpen(false);
              router.push("/checkout");
            }}
            className="w-full bg-green-600 text-white py-3 rounded-lg"
          >
            Proceed to Checkout
          </button>

        </div>

      </div>

    </div>
  );
}
