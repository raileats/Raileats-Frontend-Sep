"use client";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="bg-black text-white px-6 py-3 flex justify-between items-center shadow-md">
      {/* ✅ Logo */}
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/logo.png"   // public/logo.png से सही call
          alt="RailEats Logo"
          width={40}
          height={40}
        />
        <span className="text-xl font-bold">RailEats</span>
      </Link>

      {/* ✅ Menu Items */}
      <div className="hidden md:flex gap-6 text-sm font-medium">
        <Link href="/">Home</Link>
        <Link href="/train-tools">Train Tools</Link>
        <Link href="/offers">Offers</Link>
        <Link href="/orders">Orders</Link>
        <Link href="/menu">Menu</Link>
      </div>
    </nav>
  );
}
