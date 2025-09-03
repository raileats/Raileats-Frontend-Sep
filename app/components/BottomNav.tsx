"use client";
import React from "react";
import { Home, Train, Gift, Menu } from "lucide-react";
import Image from "next/image";

export default function BottomNav() {
  return (
    <div className="bottom-nav">
      {/* Tabs */}
      <div className="flex flex-col items-center text-xs">
        <Home className="w-5 h-5" />
        <span>Home</span>
      </div>

      <div className="flex flex-col items-center text-xs">
        <Train className="w-5 h-5" />
        <span>Train Tools</span>
      </div>

      {/* Center Partner Button */}
      <button className="partner-btn">
        <Image
          src="/logo.png"
          alt="Partner"
          width={40}
          height={40}
          className="rounded-full"
        />
      </button>

      <div className="flex flex-col items-center text-xs">
        <Gift className="w-5 h-5" />
        <span>Offers</span>
      </div>

      <div className="flex flex-col items-center text-xs">
        <Menu className="w-5 h-5" />
        <span>My Menu</span>
      </div>
    </div>
  );
}
