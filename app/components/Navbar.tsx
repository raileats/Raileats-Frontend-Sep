"use client";
import Image from "next/image";

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 w-full bg-white shadow-md z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="RailEats" width={40} height={40} />
          <span className="text-xl font-bold text-yellow-500">RailEats</span>
        </div>

        {/* Login Button */}
        <button className="bg-black text-white px-4 py-2 rounded-md text-sm">
          Login
        </button>
      </div>
    </header>
  );
}
