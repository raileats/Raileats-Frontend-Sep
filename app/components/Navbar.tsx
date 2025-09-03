"use client";
import Image from "next/image";
import { useState } from "react";

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState(false);

  return (
    <nav className="bg-white shadow-md px-4 py-2 flex justify-between items-center">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <Image src="/logo.png" alt="RailEats Logo" width={40} height={40} />
        <span className="font-bold text-lg text-yellow-600">RailEats</span>
      </div>

      {/* Login / Profile */}
      {loggedIn ? (
        <button className="text-sm font-medium">My Profile ▼</button>
      ) : (
        <button
          onClick={() => setLoggedIn(true)}
          className="bg-yellow-500 text-black px-3 py-1 rounded"
        >
          Login
        </button>
      )}
    </nav>
  );
}
