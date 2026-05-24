"use client";

import React from "react";
import { useCart } from "../lib/useCart";
import { openCart } from "../lib/cartEvents";

export default function CartPillMobile({ minOrder = 0 }: any) {

  const { count, total, clearCart } = useCart();

  // 🚫 Minimum order check
  const isBlocked = total < minOrder;

  // 🚫 Hide if cart empty
  if (!count || count === 0) return null;

  return (
    <div
      className="
        fixed
        bottom-[78px]
        left-1/2
        -translate-x-1/2
        z-[9999]
        w-[92%]
        max-w-md
        md:hidden
      "
    >

      {/* MAIN BAR */}
      <div
        className="
          bg-green-600
          text-white
          rounded-2xl
          shadow-2xl
          px-4
          py-3
          flex
          items-center
          justify-between
          border
          border-green-500
          backdrop-blur
        "
      >

        {/* LEFT SIDE */}
        <div className="flex flex-col leading-tight">

          <span className="font-bold text-sm">
            {count} Item{count > 1 ? "s" : ""}
          </span>

          <span className="text-sm opacity-90">
            ₹{Number(total).toFixed(0)}
          </span>

        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-2">

          {/* VIEW CART BUTTON */}
          <button
            onClick={() => {

              if (isBlocked) {
                alert(`Minimum order ₹${minOrder} complete karo`);
                return;
              }

              openCart();
            }}
            className={`
              bg-white
              text-green-700
              font-semibold
              text-sm
              px-4
              py-2
              rounded-xl
              transition-all
              duration-200
              active:scale-95
              ${
                isBlocked
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:scale-105"
              }
            `}
          >
            View Cart
          </button>

          {/* CLEAR BUTTON */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearCart();
            }}
            className="
              w-8
              h-8
              rounded-full
              bg-red-500
              text-white
              font-bold
              flex
              items-center
              justify-center
              active:scale-95
            "
          >
            ✕
          </button>

        </div>

      </div>

      {/* MIN ORDER WARNING */}
      {isBlocked && (
        <div className="mt-2 text-center text-xs font-medium text-red-500">
          Minimum order ₹{minOrder} complete karo
        </div>
      )}

    </div>
  );
}
