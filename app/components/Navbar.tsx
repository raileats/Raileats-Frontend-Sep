"use client";

import Link from "next/link";
import LoginMenu from "./LoginMenu";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-black">
      {/* site width = same as rest of page */}
      <div className="mx-auto max-w-5xl px-4 h-14 md:h-16 flex items-center justify-between gap-2">
        
        {/* Left: Logo + Brand */}
        <Link href="/" className="flex items-center gap-2 md:gap-3 group">
          <img
            src="/logo.png"
            alt="RailEats"
            className="h-11 w-11 md:h-[52px] md:w-[52px] rounded-full animate-bubbleGlow"
          />
          <span className="text-xl md:text-2xl font-semibold leading-tight">
            <span className="text-[#F6C800] transition duration-300 group-hover:text-white">
              Rail
            </span>
            <span className="text-white transition duration-300 group-hover:text-[#F6C800]">
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
