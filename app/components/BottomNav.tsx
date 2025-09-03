// app/components/BottomNav.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Home, Utensils, Gift, ClipboardList, Menu } from "lucide-react";

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-md md:hidden z-50">
      <div className="flex justify-between items-center px-4">
        <Link href="/" className="flex flex-col items-center text-xs py-2">
          <Home size={20} />
          Home
        </Link>

        <Link href="/train-tools" className="flex flex-col items-center text-xs py-2">
          <Utensils size={20} />
          Tools
        </Link>

        {/* Bubble Logo Center */}
        <div className="relative -mt-6">
          <Link
            href="/"
            className="flex items-center justify-center w-14 h-14 bg-yellow-400 rounded-full shadow-lg border-4 border-white"
          >
            <Image
              src="/logo.png" // public/logo.png
              alt="RailEats"
              width={40}
              height={40}
              className="rounded-full"
            />
          </Link>
        </div>

        <Link href="/offers" className="flex flex-col items-center text-xs py-2">
          <Gift size={20} />
          Offers
        </Link>

        <Link href="/orders" className="flex flex-col items-center text-xs py-2">
          <ClipboardList size={20} />
          Orders
        </Link>

        <Link href="/menu" className="flex flex-col items-center text-xs py-2">
          <Menu size={20} />
          Menu
        </Link>
      </div>
    </nav>
  );
}
