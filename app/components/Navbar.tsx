"use client";

import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  return (
    <header className="bg-black text-white px-6 py-3 flex items-center justify-between">
      {/* Logo + Name */}
      <div className="flex items-center gap-2">
        <Image
          src="/logo.png" // public/logo.png
          alt="RailEats Logo"
          width={40}
          height={40}
        />
        <span className="text-xl font-bold">
          <span className="text-yellow-400">Rail</span>Eats
        </span>
      </div>

      {/* Nav Links */}
      <nav className="flex gap-6 text-sm">
        <Link href="/home">Home</Link>
        <Link href="/train-tools">Train Tools</Link>
        <Link href="/offers">Offers</Link>
        <Link href="/orders">Orders</Link>
        <Link href="/menu">Menu</Link>
      </nav>
    </header>
  );
}
