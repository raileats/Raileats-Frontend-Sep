"use client";

import { useCart } from "@/app/lib/useCart";
import Link from "next/link";

type Props = {
  /** If you pass onOpen it will call that (for pages that show a modal),
   * otherwise it will just link to /checkout. */
  onOpen?: () => void;
  /** Optional extra classes when you want to shift it slightly */
  className?: string;
};

export default function CartPillMobile({ onOpen, className = "" }: Props) {
  const { count, total } = useCart();
  if (!count) return null;

  const content = (
    <span
      className="inline-flex items-center rounded-full bg-blue-600 text-white px-3 py-1.5 text-sm shadow
                 whitespace-nowrap"
    >
      <span className="font-semibold mr-1">{count}</span>
      <span className="opacity-90 mr-2">₹{Number(total).toFixed(0)}</span>
      <span className="underline">View cart</span>
    </span>
  );

  // Position: just below the navbar, top-right. Hidden on desktop.
  const basePos =
    "sm:hidden fixed right-3 top-[72px] z-[60]"; // tweak top value if your navbar height changes on mobile

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
