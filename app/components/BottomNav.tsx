"use client";
import { Home, Train, Gift, Utensils } from "lucide-react";

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t shadow z-50">
      <div className="max-w-5xl mx-auto grid grid-cols-5 text-center text-xs">
        {/* Home */}
        <a href="/" className="flex flex-col items-center py-2 text-gray-700">
          <Home size={22} />
          <span>Home</span>
        </a>

        {/* Tools */}
        <a href="/tools" className="flex flex-col items-center py-2 text-gray-700">
          <Train size={22} />
          <span>Tools</span>
        </a>

        {/* Vendor Partner (Zoop style but same size as tabs) */}
        <a
          href="/vendor-partner"
          className="flex flex-col items-center py-2 text-gray-700"
        >
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-yellow-400">
            <img src="/logo.png" alt="RailEats" className="h-5 w-5" />
          </div>
          <span>Partner</span>
        </a>

        {/* Offers */}
        <a href="/offers" className="flex flex-col items-center py-2 text-gray-700">
          <Gift size={22} />
          <span>Offers</span>
        </a>

        {/* My Menu */}
        <a href="/menu" className="flex flex-col items-center py-2 text-gray-700">
          <Utensils size={22} />
          <span>My Menu</span>
        </a>
      </div>
    </nav>
  );
}
