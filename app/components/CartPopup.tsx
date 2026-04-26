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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">

      {/* CART BOX */}
      <div
        className="bg-white w-full md:w-[380px] rounded-t-2xl shadow-xl flex flex-col"
        style={{
          height: "calc(100vh - var(--nav-h) - 10px)",
        }}
      >

        {/* HANDLE */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2 mb-2"></div>

        {/* HEADER */}
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <h2 className="font-semibold">Your Cart</h2>
          <button onClick={() => setOpen(false)}>×</button>
        </div>

        {/* ITEMS */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between">

              <div className="flex-1 pr-2">
                <p className="font-medium text-sm">{it.name}</p>
                <p className="text-xs text-gray-500">₹{it.price}</p>
              </div>

              <div className="flex items-center gap-2 border rounded px-2 py-1">
                <button onClick={() => decreaseQty(it.id)}>-</button>
                <span>{it.qty}</span>
                <button onClick={() => increaseQty(it.id)}>+</button>
              </div>

              <div className="w-16 text-right font-medium text-sm">
                ₹{it.price * it.qty}
              </div>

            </div>
          ))}
        </div>

        {/* 🔥 FOOTER (GLOBAL.CSS SYSTEM BASED) */}
        <div className="fixed-bottom-action">

          <div className="flex justify-between mb-3 font-semibold px-2">
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
