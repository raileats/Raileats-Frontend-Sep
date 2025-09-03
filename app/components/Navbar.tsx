"use client";
import React from "react";
import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="navbar">
      {/* Left: Logo */}
      <div className="flex items-center space-x-2">
        <Image
          src="/logo.png"
          alt="RailEats"
          width={40}
          height={40}
          className="rounded-full animate-bubbleGlow"
        />
        <span className="text-xl font-bold text-gray-800">
          <span className="text-yellow-600">Rail</span>Eats
        </span>
      </div>

      {/* Right: Login Button */}
      <button className="bg-yellow-600 text-white px-4 py-1 rounded-md text-sm font-medium hover:bg-yellow-700">
        Login
      </button>
    </nav>
  );
}
