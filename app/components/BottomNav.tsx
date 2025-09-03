"use client";

import Link from "next/link";
import Image from "next/image";

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-inner border-t border-gray-200 flex justify-around items-center py-2 md:hidden">
      <Link href="/home" className="flex flex-col items-center text-sm">
        <span>🏠</span>
        Home
      </Link>
      <Link href="/train-tools" className="flex flex-col items-center text-sm">
        <span>🛠️</span>
        Tools
      </Link>
      <div className="relative -top-6">
        <Image
          src="/logo.png"
          alt="RailEats Logo"
          width={50}
          height={50}
          className="rounded-full border-2 border-yellow-400 shadow-lg"
        />
      </div>
      <Link href="/orders" className="flex flex-col items-center text-sm">
        <span>🛒</span>
        Orders
      </Link>
      <Link href="/menu" className="flex flex-col items-center text-sm">
        <span>📜</span>
        Menu
      </Link>
    </nav>
  );
}
