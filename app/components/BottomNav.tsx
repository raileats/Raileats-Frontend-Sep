"use client";
import { useState } from "react";
import { Home, Gift, Train } from "lucide-react"; // icons
import PartnerForm from "./PartnerForm"; // ✅ import popup form

export default function BottomNav() {
  const [partnerOpen, setPartnerOpen] = useState(false);

  return (
    <>
      {/* ✅ Bottom Fixed Navbar */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t shadow-lg flex justify-around items-center h-16 z-40">
        <button className="flex flex-col items-center text-sm">
          <Home size={22} />
          Home
        </button>
        <button className="flex flex-col items-center text-sm">
          <Train size={22} />
          Train Tools
        </button>

        {/* Center Bubble Partner Button */}
        <button
          onClick={() => setPartnerOpen(true)}
          className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-400 rounded-full w-14 h-14 flex items-center justify-center shadow-lg border-4 border-white"
        >
          <img src="/logo.png" alt="RailEats Logo" className="w-8 h-8" />
        </button>

        <button className="flex flex-col items-center text-sm">
          <Gift size={22} />
          Offers
        </button>
        <button className="flex flex-col items-center text-sm">
          My Menu
        </button>
      </nav>

      {/* ✅ Popup Form */}
      {partnerOpen && <PartnerForm onClose={() => setPartnerOpen(false)} />}
    </>
  );
}
