"use client";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="bg-black text-white px-6 py-3 flex items-center justify-between shadow-md">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <Image
          src="/logo.png" // ✅ ensure logo.png is inside /public
          alt="RailEats Logo"
          width={40}
          height={40}
          priority
        />
        <span className="text-xl font-bold">RailEats</span>
      </div>

      {/* Links */}
      <div className="hidden md:flex gap-6">
        <Link href="/">Home</Link>
        <Link href="/train-tools">Train Tools</Link>
        <Link href="/offers">Offers</Link>
        <Link href="/orders">Orders</Link>
        <Link href="/menu">Menu</Link>
      </div>
    </nav>
  );
}
