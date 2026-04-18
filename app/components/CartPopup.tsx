"use client";

import React, { useEffect, useState } from "react";
import { useCart } from "../lib/useCart";
import { onOpenCart, onCloseCart } from "../lib/cartEvents";
import { useRouter } from "next/navigation";

export default function CartPopup() {
  const { items, total } = useCart();
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
      <div className="bg-white w-[320px] rounded-lg shadow-xl overflow-hidden">

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
        <div className="px-4 py-2 space-y-2 text-sm max-h-[200px] overflow-y-auto">
          {items.map((it) => (
            <div key={it.id} className="flex justify-between items-center">
              
              {/* LEFT */}
              <div className="flex-1 pr-2">
                <div className="truncate">
                  {it.name} x {it.qty}
                </div>
              </div>

              {/* RIGHT */}
              <div className="text-right font-medium">
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
