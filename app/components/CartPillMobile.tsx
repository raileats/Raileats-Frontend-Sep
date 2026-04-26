"use client";

import Link from "next/link";
import { useCart } from "../lib/useCart";
import { openCart } from "../lib/cartEvents";

type Props = {
  onOpen?: () => void;
  className?: string;
};

export default function CartPillMobile({ onOpen, className = "" }: Props) {
  const { count, total } = useCart();

  // ❌ nothing in cart → hide
  if (!count || count <= 0) return null;

  const handleClick = () => {
    if (onOpen) {
      onOpen();
    } else {
      openCart(); // ✅ popup trigger (default)
    }
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden px-3 pb-3 ${className}`}
    >
      <div className="bg-green-600 text-white rounded-xl shadow-lg flex items-center justify-between px-4 py-3">

        {/* LEFT INFO */}
        <div>
          <div className="text-sm font-semibold">
            {count} item{count > 1 ? "s" : ""}
          </div>
          <div className="text-xs opacity-90">
            ₹{Number(total || 0).toFixed(0)}
          </div>
        </div>

        {/* BUTTON */}
        {onOpen ? (
          <button
            onClick={handleClick}
            className="bg-white text-green-700 px-4 py-2 rounded-lg text-sm font-semibold"
          >
            View Cart
          </button>
        ) : (
          <Link
            href="/checkout"
            className="bg-white text-green-700 px-4 py-2 rounded-lg text-sm font-semibold"
          >
            View Cart
          </Link>
        )}

      </div>
    </div>
  );
}
