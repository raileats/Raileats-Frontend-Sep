"use client";

import { useCart } from "../lib/useCart"; // ✅ Fixed (relative path)
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

  // ✅ Mobile only — Top Navbar ke bilkul neeche
  const basePos =
    "lg:hidden fixed right-3 top-[60px] z-[9999]"; 
  // your navbar height = 56px (approx) so top ~60px

  return onOpen ? (
    <button className={`${basePos} ${className}`} onClick={onOpen} aria-label="View cart">
      {content}
    </button>
  ) : (
    <Link href="/checkout" className={`${basePos} ${className}`} aria-label="View cart">
      {content}
    </Link>
  );
}
