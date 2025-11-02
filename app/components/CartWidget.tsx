"use client";

import React from "react";
import Link from "next/link";
import { useCart } from "../lib/useCart";
import { priceStr } from "../lib/priceUtil";

export default function CartWidget() {
  const { count, total } = useCart();

  // Nothing in cart -> keep navbar clean
  if (!count) return null;

  return (
    <Link
      href="/checkout"
      className="ml-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50"
      aria-label="View cart"
    >
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs">
        {count}
      </span>
      <span className="font-medium">{priceStr(total)}</span>
    </Link>
  );
}
