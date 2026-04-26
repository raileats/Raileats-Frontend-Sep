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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white w-[340px] rounded-lg shadow-xl overflow-hidden">

        {/* HEADER */}
        <div className="flex justify-between items-center px-4 py-2 border-b">
          <h2 className="font-semibold text-sm">Your Cart</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-500 text-lg"
          >
            ×
          </button>
        </div>

        {/* ITEMS */}
        <div className="px-4 py-3 space-y-3 text-sm max-h-[260px] overflow-y-auto">
          {items.map((it) => (
            <div key={it.id} className="flex justify-between items-center">

              {/* LEFT */}
              <div className="flex-1 pr-2">
                <div className="font-medium">{it.name}</div>
                <div className="text-xs text-gray-500">₹{it.price}</div>
              </div>

              {/* QTY CONTROL */}
              <div className="flex items-center gap-2 border rounded px-2 py-1">

                <button
                  onClick={() => decreaseQty(it.id)}
                  className="px-2 text-lg"
                >
                  -
                </button>

                <span className="min-w-[20px] text-center">
                  {it.qty}
                </span>

                <button
                  onClick={() => increaseQty(it.id)}
                  className="px-2 text-lg"
                >
                  +
                </button>

              </div>

              {/* PRICE */}
              <div className="w-16 text-right font-medium">
                ₹{it.price * it.qty}
              </div>

            </div>
          ))}
        </div>

        {/* TOTAL */}
        <div className="flex justify-between items-center px-4 py-2 border-t text-sm font-semibold">
          <span>Total</span>
          <span>₹{total}</span>
        </div>

        {/* BUTTON */}
        <div className="p-3">
          <button
            onClick={() => {
              setOpen(false);
              router.push("/checkout");
            }}
            className="w-full bg-green-600 text-white py-2 rounded-md font-medium"
          >
            Checkout
          </button>
        </div>

      </div>
    </div>
  );
}
