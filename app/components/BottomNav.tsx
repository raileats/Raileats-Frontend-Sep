"use client";
import Link from "next/link";
import { Home, Train, Gift, Utensils } from "lucide-react";

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t shadow-md flex justify-around items-center py-2 z-50">
      {/* Home */}
      <Link href="/" className="flex flex-col items-center text-sm">
        <Home className="h-6 w-6" />
        Home
      </Link>

      {/* Train Tools */}
      <Link href="#train-tools" className="flex flex-col items-center text-sm">
        <Train className="h-6 w-6" />
        Train Tools
      </Link>

      {/* Become Partner (Bubble Logo in Center) */}
      <div className="relative -top-6">
        <button
          onClick={() => alert("Open Restaurant Partner Form")}
          className="h-16 w-16 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-4 border-white"
        >
          <img src="/logo.png" alt="RailEats" className="h-10 w-10" />
        </button>
      </div>

      {/* Offers */}
      <Link href="#offers" className="flex flex-col items-center text-sm">
        <Gift className="h-6 w-6" />
        Offers
      </Link>

      {/* My Menu */}
      <Link href="#menu" className="flex flex-col items-center text-sm">
        <Utensils className="h-6 w-6" />
        My Menu
      </Link>
    </nav>
  );
}
