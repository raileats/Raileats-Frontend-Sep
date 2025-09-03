"use client";

import Link from "next/link";
import Image from "next/image";

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-md flex justify-between items-center px-6 py-2 md:hidden z-50">
      {/* Home */}
      <Link
        href="/home"
        className="flex flex-col items-center text-sm text-gray-700"
      >
        <span className="text-xl">🏠</span>
        Home
      </Link>

      {/* Tools */}
      <Link
        href="/train-tools"
        className="flex flex-col items-center text-sm text-gray-700"
      >
        <span className="text-xl">🛠️</span>
        Tools
      </Link>

      {/* Center Bubble Logo */}
      <div className="relative -top-6">
        <Link href="/home">
          <div className="w-16 h-16 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg border-4 border-white">
            <Image
              src="/logo.png" // 👈 आपका logo public/logo.png में होना चाहिए
              alt="RailEats Logo"
              width={40}
              height={40}
            />
          </div>
        </Link>
      </div>

      {/* Orders */}
      <Link
        href="/orders"
        className="flex flex-col items-center text-sm text-gray-700"
      >
        <span className="text-xl">🛒</span>
        Orders
      </Link>

      {/* Menu */}
      <Link
        href="/menu"
        className="flex flex-col items-center text-sm text-gray-700"
      >
        <span className="text-xl">📋</span>
        Menu
      </Link>
    </nav>
  );
}
