// app/components/CartWidget.tsx  (or wherever your badge lives)
"use client";
import React from "react";
import Link from "next/link";
import { useCart } from "../lib/useCart";
import { openCart } from "../lib/cartEvents";  // ⬅️ add

export default function CartWidget() {
  const { count, total } = useCart();
  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={openCart}                     // ⬅️ open side cart
      className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 shadow-md hover:shadow-lg"
      aria-label="Open cart"
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold">
        {count}
      </span>
      <span className="text-sm font-medium">₹{total}</span>
    </button>
  );
}
