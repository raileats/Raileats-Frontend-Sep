"use client";
import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="bg-black text-white px-6 py-3 flex items-center justify-between shadow-md">
      {/* Logo */}
      <div className="flex items-center space-x-2">
        <Image src="/public/logo.png" alt="RailEats Logo" width={40} height={40} />
        <span className="font-bold text-xl">RailEats</span>
      </div>

      {/* Links */}
      <ul className="hidden md:flex space-x-6 font-medium">
        <li className="hover:text-yellow-400 cursor-pointer">Home</li>
        <li className="hover:text-yellow-400 cursor-pointer">Train Tools</li>
        <li className="hover:text-yellow-400 cursor-pointer">Offers</li>
        <li className="hover:text-yellow-400 cursor-pointer">Orders</li>
        <li className="hover:text-yellow-400 cursor-pointer">Menu</li>
      </ul>
    </nav>
  );
}
