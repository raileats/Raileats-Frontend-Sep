"use client";

import React from "react";
import { useCart } from "../lib/useCart";
import { openCart } from "../lib/cartEvents";

export default function CartPillMobile({ minOrder = 0 }: any) {
  const { count, total, clearCart } = useCart();

  // 🔥 BLOCK CHECK
  const isBlocked = total < minOrder;

  if (!count || count === 0) return null;

  return (
    <div className="fixed bottom-[80px] left-1/2 -translate-x-1/2 z-10 md:hidden">

      <div className="bg-blue-600 text-white px-4 py-3 rounded-full shadow-lg flex flex-col items-center gap-2">

        <div className="flex items-center gap-3">

          {/* ❌ CLEAR BUTTON */}
          <button
            onClick={(e) => {
              e.stopPropagation();
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
            onClick={() => {
              if (isBlocked) {
                alert(`Minimum order ₹${minOrder} complete karo`);
                return;
              }
              openCart();
            }}
            className={`underline text-sm ${
              isBlocked ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            View Cart
          </button>

        </div>

        {/* 🔥 MIN ORDER MESSAGE */}
        {isBlocked && (
          <div className="text-red-200 text-xs text-center">
            Min order ₹{minOrder} complete karo
          </div>
        )}

      </div>
    </div>
  );
}
