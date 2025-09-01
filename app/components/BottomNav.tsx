"use client";

import Link from "next/link";
import Image from "next/image";

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-300 shadow-md flex justify-around items-center py-2 z-50 md:hidden">
      <Link href="/" className="flex flex-col items-center text-sm text-gray-700">
        <span className="text-xl">🏠</span>
        <span>Home</span>
      </Link>

      <Link href="/train-tools" className="flex flex-col items-center text-sm text-gray-700">
        <span className="text-xl">🚆</span>
        <span>Train</span>
      </Link>

      {/* 🔥 Center Logo */}
      <Link href="/" className="flex flex-col items-center">
        <Image
          src="/logo.png"  // public/logo.png में logo डालो
          alt="RailEats Logo"
          width={40}
          height={40}
          className="rounded-full"
        />
      </Link>

      <Link href="/offers" className="flex flex-col items-center text-sm text-gray-700">
        <span className="text-xl">🎁</span>
        <span>Offers</span>
      </Link>

      <Link href="/orders" className="flex flex-col items-center text-sm text-gray-700">
        <span className="text-xl">📦</span>
        <span>Orders</span>
      </Link>
    </nav>
  );
}
