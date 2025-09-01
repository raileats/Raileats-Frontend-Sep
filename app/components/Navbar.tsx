"use client";
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-black text-white px-6 py-3 flex items-center justify-between shadow-md">
      {/* Left Logo */}
      <div className="flex items-center gap-2">
        <Image
          src="/logo.png"
          alt="RailEats Logo"
          width={40}
          height={40}
          className="rounded-md"
        />
        <span className="text-xl font-bold">RailEats</span>
      </div>

      {/* Right Menu */}
      <ul className="hidden md:flex gap-6 font-medium">
        <li><Link href="/">Home</Link></li>
        <li><Link href="/train-tools">Train Tools</Link></li>
        <li><Link href="/offers">Offers</Link></li>
        <li><Link href="/orders">Orders</Link></li>
        <li><Link href="/menu">Menu</Link></li>
      </ul>
    </nav>
  );
}
