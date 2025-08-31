"use client";
import { Home, Train, Gift, ShoppingBag, Menu } from "lucide-react";
import Link from "next/link";

export default function BottomNav() {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-300 shadow-md flex justify-around py-2 md:hidden z-50">
      <Link href="/" className="flex flex-col items-center text-xs text-gray-700">
        <Home size={20} />
        Home
      </Link>
      <Link href="/tools" className="flex flex-col items-center text-xs text-gray-700">
        <Train size={20} />
        Train Tools
      </Link>
      <Link href="/offers" className="flex flex-col items-center text-xs text-gray-700">
        <Gift size={20} />
        Offers
      </Link>
      <Link href="/orders" className="flex flex-col items-center text-xs text-gray-700">
        <ShoppingBag size={20} />
        Orders
      </Link>
      <Link href="/menu" className="flex flex-col items-center text-xs text-gray-700">
        <Menu size={20} />
        Menu
      </Link>
    </div>
  );
}
