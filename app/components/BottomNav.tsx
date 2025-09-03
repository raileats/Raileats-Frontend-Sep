"use client";

import Link from "next/link";
import { Home, Train, ShoppingBag, Utensils } from "lucide-react";

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg flex justify-around items-center h-16 md:hidden z-50">
      {/* Home */}
      <Link href="/" className="flex flex-col items-center text-xs text-gray-700">
        <Home className="w-6 h-6" />
        Home
      </Link>

      {/* Train Tools */}
      <Link href="/tools" className="flex flex-col items-center text-xs text-gray-700">
        <Train className="w-6 h-6" />
        Tools
      </Link>

      {/* Center Bubble Logo */}
      <div className="relative -top-6 bg-yellow-400 rounded-full p-3 shadow-lg border-4 border-white">
        <img src="/logo.png" alt="RailEats Logo" className="w-10 h-10 rounded-full" />
      </div>

      {/* Orders */}
      <Link href="/orders" className="flex flex-col items-center text-xs text-gray-700">
        <ShoppingBag className="w-6 h-6" />
        Orders
      </Link>

      {/* Menu */}
      <Link href="/menu" className="flex flex-col items-center text-xs text-gray-700">
        <Utensils className="w-6 h-6" />
        Menu
      </Link>
    </nav>
  );
}
