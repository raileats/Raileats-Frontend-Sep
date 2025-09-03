"use client";
import { useState } from "react";
import { Home, Gift, Train, Menu } from "lucide-react"; // icons
import PartnerForm from "./PartnerForm"; // ✅ popup form import

export default function BottomNav() {
  const [partnerOpen, setPartnerOpen] = useState(false);

  return (
    <>
      {/* ✅ Bottom Fixed Navbar */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t shadow-lg flex justify-between items-center h-16 px-4 z-40">
        {/* Home */}
        <button className="flex flex-col items-center justify-center text-xs text-gray-700">
          <Home size={22} className="text-blue-500" />
          Home
        </button>

        {/* Train */}
        <button className="flex flex-col items-center justify-center text-xs text-gray-700">
          <Train size={22} className="text-green-500" />
          Train Tools
        </button>

        {/* ✅ Center Partner Bubble with Animation */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setPartnerOpen(true)}
            className="relative bg-yellow-400 rounded-full w-16 h-16 flex items-center justify-center shadow-lg border-4 border-white -mt-8 animate-bubbleGlow hover:animate-pulseGlow focus:animate-pulseGlow transition-all"
          >
            <img src="/logo.png" alt="RailEats Logo" className="w-9 h-9 relative z-10" />
            {/* Shine overlay */}
            <div className="absolute inset-0 animate-shine rounded-full"></div>
          </button>
          <span className="text-xs font-semibold text-yellow-600 mt-1">
            Partner
          </span>
        </div>

        {/* Offers */}
        <button className="flex flex-col items-center justify-center text-xs text-gray-700">
          <Gift size={22} className="text-pink-500" />
          Offers
        </button>

        {/* My Menu */}
        <button className="flex flex-col items-center justify-center text-xs text-gray-700">
          <Menu size={22} className="text-purple-500" />
          My Menu
        </button>
      </nav>

      {/* ✅ Popup Partner Form */}
      {partnerOpen && <PartnerForm onClose={() => setPartnerOpen(false)} />}
    </>
  );
}
