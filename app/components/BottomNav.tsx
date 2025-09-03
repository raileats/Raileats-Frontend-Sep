"use client";
import { Home, Train, Percent, User } from "lucide-react";

export default function BottomNav() {
  return (
    <div className="bg-white shadow-t border-t border-gray-200 flex justify-around items-center h-14">
      <button className="flex flex-col items-center text-xs">
        <Home size={20} />
        Home
      </button>
      <button className="flex flex-col items-center text-xs">
        <Train size={20} />
        Train Tools
      </button>
      <button className="flex flex-col items-center text-xs">
        <Percent size={20} />
        Offers
      </button>
      <button className="flex flex-col items-center text-xs">
        <User size={20} />
        My Menu
      </button>
    </div>
  );
}
