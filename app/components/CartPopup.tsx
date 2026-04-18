"use client";

import React, { useEffect, useState } from "react";
import { useCart } from "../lib/useCart";
import { onOpenCart, onCloseCart } from "../lib/cartEvents";
import { useRouter } from "next/navigation";

export default function CartPopup() {
  const { items, total } = useCart();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  /* 🔥 LISTEN OPEN EVENT */
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-[320px] rounded-lg shadow-lg p-4 relative">

        {/* CLOSE */}
        <button
          className="absolute right-3 top-2 text-gray-500"
          onClick={() => setOpen(false)}
        >
          ✕
        </button>

        <h2 className="font-semibold mb-3">Your Cart</h2>

        {/* ITEMS */}
        <div className="space-y-2 text-sm">
          {items.map((it) => (
            <div key={it.id} className="flex justify-between">
              <span>
                {it.name} x {it.qty}
              </span>
              <span>₹{it.price * it.qty}</span>
            </div>
          ))}
        </div>

        {/* TOTAL */}
        <div className="flex justify-between mt-3 font-semibold border-t pt-2">
          <span>Total</span>
          <span>₹{total}</span>
        </div>

        {/* CHECKOUT */}
        <button
          className="mt-3 w-full bg-green-600 text-white py-2 rounded"
          onClick={() => {
            setOpen(false);
            router.push("/checkout");
          }}
        >
          Checkout
        </button>
      </div>
    </div>
  );
}
