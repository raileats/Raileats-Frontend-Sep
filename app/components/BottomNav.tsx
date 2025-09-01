"use client";
import Link from "next/link";

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-md border-t flex justify-around items-center h-16 z-50">
      {/* Home */}
      <Link href="/" className="flex flex-col items-center text-sm">
        <span className="text-xl">🏠</span>
        <span>Home</span>
      </Link>

      {/* Train Tools */}
      <Link href="/train-tools" className="flex flex-col items-center text-sm">
        <span className="text-xl">🚆</span>
        <span>Tools</span>
      </Link>

      {/* Center Logo Bubble */}
      <div className="absolute -top-6 bg-yellow-400 rounded-full p-3 shadow-lg border-4 border-white">
        <Link href="/">
          <img
            src="/logo.png"
            alt="RailEats"
            className="w-10 h-10 rounded-full"
          />
        </Link>
      </div>

      {/* Offers */}
      <Link href="/offers" className="flex flex-col items-center text-sm">
        <span className="text-xl">🎁</span>
        <span>Offers</span>
      </Link>

      {/* Orders */}
      <Link href="/orders" className="flex flex-col items-center text-sm">
        <span className="text-xl">🛒</span>
        <span>Orders</span>
      </Link>

      {/* Menu */}
      <Link href="/menu" className="flex flex-col items-center text-sm">
        <span className="text-xl">📋</span>
        <span>Menu</span>
      </Link>
    </nav>
  );
}
