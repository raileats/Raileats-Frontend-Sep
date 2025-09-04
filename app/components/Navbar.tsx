"use client";
import Link from "next/link";
import LoginMenu from "./LoginMenu";

export default function Navbar() {
  return (
    <header
      className="
        sticky top-0 z-50 w-full border-b
        bg-white/90 supports-[backdrop-filter]:bg-white/80 backdrop-blur
        mb-0
      "
    >
      {/* site width = 5xl, mobile me height thodi chhoti to gap zero-feel */}
      <div className="mx-auto w-full max-w-5xl px-4 h-14 md:h-16 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 md:gap-3">
          <img
            src="/logo.png"
            alt="RailEats"
            className="h-10 w-10 md:h-12 md:w-12 rounded-full animate-bubbleGlow"
          />
          <span className="text-xl md:text-2xl font-semibold leading-none">
            <span className="text-black">Rail</span>
            <span className="text-yellow-600">Eats</span>
          </span>
        </Link>

        {/* Login / User dropdown */}
        <LoginMenu />
      </div>
    </header>
  );
}
