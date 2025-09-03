"use client";

import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-black text-white px-6 py-3 flex justify-between items-center">
      {/* Logo */}
      <div className="flex items-center space-x-2">
        <Image
          src="/logo.png" // 👈 आपका logo public/logo.png में होना चाहिए
          alt="RailEats Logo"
          width={40}
          height={40}
        />
        <span className="text-xl font-bold">
          <span className="text-yellow-400">Rail</span>
          <span className="text-white">Eats</span>
        </span>
      </div>

      {/* Links */}
      <div className="space-x-6 hidden md:flex">
        <Link href="/home">Home</Link>
        <Link href="/train-tools">Train Tools</Link>
        <Link href="/offers">Offers</Link>
        <Link href="/orders">Orders</Link>
        <Link href="/menu">Menu</Link>
      </div>
    </nav>
  );
}
