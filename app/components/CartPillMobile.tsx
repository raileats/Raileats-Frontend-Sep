"use client";

import Link from "next/link";
import { useCart } from "../lib/useCart";

type Props = {
  onOpen?: () => void;
  className?: string;
};

export default function CartPillMobile({ onOpen, className = "" }: Props) {
  const { count, total } = useCart();

  // ❌ nothing in cart → hide
  if (!count || count <= 0) return null;

  const content = (
    <span
      className="inline-flex items-center rounded-full bg-blue-600 text-white 
                 px-4 py-2 text-sm shadow whitespace-nowrap"
    >
      <span className="font-semibold mr-1">{count}</span>
      <span className="opacity-90 mr-2">₹{Number(total || 0).toFixed(0)}</span>
      <span className="underline">View cart</span>
    </span>
  );

  const baseClass = `fixed bottom-4 left-1/2 -translate-x-1/2 z-50 lg:hidden ${className}`;

  // ✅ अगर popup खोलना है
  if (onOpen) {
    return (
      <button className={baseClass} onClick={onOpen} aria-label="View cart">
        {content}
      </button>
    );
  }

  // ✅ default → checkout page
  return (
    <Link href="/checkout" className={baseClass} aria-label="View cart">
      {content}
    </Link>
  );
}
