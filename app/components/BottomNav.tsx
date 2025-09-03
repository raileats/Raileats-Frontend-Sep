"use client";
import { useState } from "react";
import { Home, Gift, Train, Menu } from "lucide-react"; // icons
import PartnerForm from "./PartnerForm"; // ✅ popup form import

export default function BottomNav() {
  const [partnerOpen, setPartnerOpen] = useState(false);

  return (
    <>
      {/* ✅ Bottom Fixed Navbar */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t shadow-lg flex justify-around items-center h-16 z-40">
        <button className="flex flex-col items-center text-xs">
          <Home size={22} />
          Home
        </button>

        <button className="flex flex-col items-center text-xs">
          <Train size={22} />
          Train Tools
        </button>

        {/* ✅ Center Bubble Partner Button */}
        <button
          onClick={() => setPartnerOpen(true)}
          className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-400 rounded-full w-16 h-16 flex items-center justify-center shadow-lg border-4 border-white"
        >
          <img src="/logo.png" alt="RailEats Logo" className="w-9 h-9" />
        </button>

        <button className="flex flex-col items-center text-xs">
          <Gift size={22} />
          Offers
        </button>

        <button className="flex flex-col items-center text-xs">
          <Menu size={22} />
          My Menu
        </button>
      </nav>

      {/* ✅ Popup Partner Form */}
      {partnerOpen && <PartnerForm onClose={() => setPartnerOpen(false)} />}
    </>
  );
}
