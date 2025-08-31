"use client";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="hidden md:flex justify-between items-center px-8 py-3 bg-black text-white fixed w-full top-0 z-50">
      {/* Left Logo */}
      <div className="flex items-center space-x-3">
        <img src="/logo.png" alt="RailEats" className="h-10 w-10" />
        <span className="text-xl font-bold text-yellow-400">Raileats.in</span>
      </div>

      {/* Links */}
      <div className="flex space-x-6 text-sm">
        <Link href="/">Home</Link>
        <Link href="/menu">Menu</Link>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/track-order">Track Order</Link>
        <Link href="/group-order">Group Order</Link>
        <Link href="/jain-food">Jain Food</Link>
        <Link href="/tools">Rail Tools</Link>
        <Link href="/login">Login</Link>
      </div>
    </nav>
  );
}
