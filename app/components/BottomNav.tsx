"use client";
import Link from "next/link";
import { Home, Train, Gift, ShoppingBag, Menu } from "lucide-react";

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white shadow-lg border-t flex justify-around items-center py-2 md:hidden">
      <Link href="/" className="flex flex-col items-center text-gray-700">
        <Home size={22} />
        <span className="text-xs">Home</span>
      </Link>

      <Link href="/train-tools" className="flex flex-col items-center text-gray-700">
        <Train size={22} />
        <span className="text-xs">Train Tools</span>
      </Link>

      {/* 🚀 Bubble Style Center Button */}
      <div className="relative -mt-8 bg-yellow-500 rounded-full p-4 shadow-lg">
        <Image src="/logo.png" alt="RailEats Logo" width={40} height={40} />
      </div>

      <Link href="/offers" className="flex flex-col items-center text-gray-700">
        <Gift size={22} />
        <span className="text-xs">Offers</span>
      </Link>

      <Link href="/menu" className="flex flex-col items-center text-gray-700">
        <Menu size={22} />
        <span className="text-xs">Menu</span>
      </Link>
    </nav>
  );
}
