"use client";

import React from "react";
import { useCart } from "../lib/useCart";
import Link from "next/link";

export default function CartWidget() {
  const { count, total } = useCart();

  if (count === 0) return null;

  return (
    <Link
      href="/cart"
      className="fixed bottom-4 right-4 bg-blue-600 text-white rounded-full shadow-lg px-4 py-2 text-sm z-[999]"
    >
      Cart • {count} • ₹{total}
    </Link>
  );
}
