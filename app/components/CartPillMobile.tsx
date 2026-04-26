"use client";

import { useCart } from "../lib/useCart";
import { openCart } from "../lib/cartEvents";

export default function CartPillMobile() {
  const { count, total } = useCart();

  // ✅ Only hide when cart empty
  if (!count || count === 0) return null;

  return (
    <div className="fixed bottom-[90px] left-1/2 -translate-x-1/2 z-50 md:hidden">

      <button
        onClick={openCart}
        className="bg-blue-600 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-3"
      >
        {/* ✅ Qty with label */}
        <span className="font-semibold">
          Qty {count}
        </span>

        {/* ✅ Total */}
        <span>
          ₹{Number(total).toFixed(0)}
        </span>

        {/* ✅ CTA */}
        <span className="underline text-sm">
          View Cart
        </span>
      </button>

    </div>
  );
}
