"use client";
import Image from "next/image";
import { useState } from "react";

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState(false);

  return (
    <nav className="bg-white shadow-md px-4 py-2 flex justify-between items-center">
      {/* Logo with bubble + shine animation */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Image
            src="/logo.png"
            alt="RailEats Logo"
            width={55}
            height={55}
            className="animate-bubbleGlow"
          />
          {/* Shine overlay */}
          <div className="absolute inset-0 animate-shine rounded-full"></div>
        </div>

        {/* Shiny Text */}
        <span className="font-bold text-lg bg-gradient-to-r from-yellow-500 via-orange-400 to-yellow-600 bg-clip-text text-transparent animate-textShine">
          RailEats
        </span>
      </div>

      {/* Login / Profile */}
      {loggedIn ? (
        <button className="text-sm font-medium">My Profile ▼</button>
      ) : (
        <button
          onClick={() => setLoggedIn(true)}
          className="bg-yellow-500 text-black px-3 py-1 rounded"
        >
          Login
        </button>
      )}
    </nav>
  );
}
