"use client";

import React, { useEffect, useState } from "react";
import { useCart } from "../lib/useCart";
import { openCart } from "../lib/cartEvents";

export default function CartPillMobile() {
  const { count, total } = useCart();
  const [show, setShow] = useState(false);

  // ✅ Auto show when item added
  useEffect(() => {
    if (count > 0) {
      setShow(true);

      // optional auto hide after 5 sec
      const t = setTimeout(() => {
        setShow(false);
      }, 5000);

      return () => clearTimeout(t);
    }
  }, [count]);

  if (!count || count === 0 || !show) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden">

      <button
        onClick={openCart}
        className="bg-blue-600 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-3"
      >
        <span className="font-semibold">{count}</span>
        <span>₹{Number(total).toFixed(0)}</span>
        <span className="underline text-sm">View Cart</span>
      </button>

    </div>
  );
}
