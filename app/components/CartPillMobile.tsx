"use client";

import { useCart } from "../lib/useCart"; // relative path (adjust if needed)
import Link from "next/link";

type Props = {
  onOpen?: () => void;
  className?: string;
};

export default function CartPillMobile({ onOpen, className = "" }: Props) {
  const { count, total } = useCart();
  if (!count) return null;

  const content = (
    <span
      className="inline-flex items-center rounded-full bg-blue-600 text-white 
                 px-3 py-1.5 text-sm shadow whitespace-nowrap"
    >
      <span className="font-semibold mr-1">{count}</span>
      <span className="opacity-90 mr-2">₹{Number(total).toFixed(0)}</span>
      <span className="underline">View cart</span>
    </span>
  );

  // Mobile only — positioned below navbar using .cart-pill-mobile (from globals.css)
  const baseClass = `lg:hidden cart-pill-mobile ${className}`;

  return onOpen ? (
    <button className={baseClass} onClick={onOpen} aria-label="View cart">
      {content}
    </button>
  ) : (
    <Link href="/checkout" className={baseClass} aria-label="View cart">
      {content}
    </Link>
  );
}
