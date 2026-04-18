"use client";

import React from "react";
import { useCart } from "../lib/useCart";
import { openCart } from "../lib/cartEvents";

export default function CartWidget() {
  const { count, total } = useCart();

  // ❌ empty cart → hide
  if (!count || count <= 0) return null;

  return (
    <button
      type="button"
      onClick={openCart}
      className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-md hover:shadow-lg border"
      aria-label="Open cart"
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold">
        {count}
      </span>

      <span className="text-sm font-medium">
        ₹{Number(total || 0).toFixed(0)}
      </span>
    </button>
  );
}
