"use client";

import React from "react";
import { useCart } from "../lib/useCart";
import { openCart } from "../lib/cartEvents";

export default function CartPillMobile() {
  const { count, total, clearCart } = useCart();

  if (!count || count === 0) return null;

  return (
    <div className="fixed bottom-[80px] left-1/2 -translate-x-1/2 z-50 md:hidden">

      <div className="bg-blue-600 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-3">

        {/* ❌ CLEAR BUTTON */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // popup open na ho
            clearCart();
          }}
          className="bg-white text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold"
        >
          ✕
        </button>

        {/* COUNT */}
        <span className="font-semibold">
          Qty {count}
        </span>

        {/* TOTAL */}
        <span>
          ₹{Number(total).toFixed(0)}
        </span>

        {/* VIEW CART */}
        <button
          onClick={openCart}
          className="underline text-sm"
        >
          View Cart
        </button>

      </div>
    </div>
  );
}