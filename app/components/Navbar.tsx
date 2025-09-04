"use client";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur">
      {/* FULL WIDTH: container ko site width ke barabar hi rakho */}
      <div className="mx-auto w-full max-w-screen-xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="RailEats" className="h-8 w-8 rounded-full" />
          <span className="text-xl font-semibold">
            <span className="text-black">Rail</span>
            <span className="text-yellow-600">Eats</span>
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="/offers" className="text-sm text-gray-700 hover:text-yellow-700">Offers</Link>
          <Link href="/tools" className="text-sm text-gray-700 hover:text-yellow-700">Train Tools</Link>
          <Link
            href="/login"
            className="rounded-md bg-yellow-600 px-4 py-1.5 text-white hover:bg-yellow-700 transition"
          >
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
