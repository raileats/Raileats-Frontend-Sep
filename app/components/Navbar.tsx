"use client";
import Link from "next/link";
import LoginMenu from "./LoginMenu";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur">
      <div className="mx-auto w-full max-w-5xl px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="RailEats"
            className="h-12 w-12 rounded-full animate-bubbleGlow"
          />
          <span className="text-2xl font-semibold leading-none">
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
