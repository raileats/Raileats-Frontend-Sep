"use client";

import Link from "next/link";
import LoginMenu from "./LoginMenu";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-black">
      {/* Site width match karega (max-w-5xl, px-4 padding) */}
      <div className="mx-auto max-w-5xl px-4 h-14 md:h-16 flex items-center justify-between gap-2">
        
        {/* Left: Logo + Brand */}
        <Link href="/" className="flex items-center gap-2 md:gap-3 group">
          <img
            src="/logo.png"
            alt="RailEats"
            className="h-10 w-10 md:h-12 md:w-12 rounded-full animate-bubbleGlow"
          />
          <span className="text-xl md:text-2xl font-semibold leading-none">
            <span className="text-[#F6C800] transition duration-300 group-hover:text-white group-hover:drop-shadow-[0_0_6px_#F6C800]">
              Rail
            </span>
            <span className="text-white transition duration-300 group-hover:text-[#F6C800] group-hover:drop-shadow-[0_0_6px_#fff]">
              Eats
            </span>
          </span>
        </Link>

        {/* Right: Only Login / User Menu */}
        <LoginMenu />
      </div>
    </header>
  );
}
