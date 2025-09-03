// app/components/Navbar.tsx
"use client";

import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-black text-white shadow-md">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png" // public/logo.png (make sure file is here)
            alt="RailEats Logo"
            width={40}
            height={40}
            className="rounded-full"
          />
          <span className="font-bold text-lg">
            <span className="text-yellow-400">Rail</span>Eats
          </span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex gap-6 text-sm">
          <Link href="/" className="hover:text-yellow-400">Home</Link>
          <Link href="/train-tools" className="hover:text-yellow-400">Train Tools</Link>
          <Link href="/offers" className="hover:text-yellow-400">Offers</Link>
          <Link href="/orders" className="hover:text-yellow-400">Orders</Link>
          <Link href="/menu" className="hover:text-yellow-400">Menu</Link>
        </div>
      </div>
    </nav>
  );
}
