"use client";

import { useState } from "react";
import Link from "next/link";
import LoginMenu from "./LoginMenu"; // यही वाली file use hogi

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-black">
      <div className="mx-auto w-full max-w-5xl px-4 h-14 md:h-16 flex items-center justify-between gap-2">
        {/* Left: Logo + Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 md:gap-3 group"
          aria-label="RailEats Home"
        >
          <img
            src="/logo.png"
            alt="RailEats"
            className="h-10 w-10 md:h-12 md:w-12 rounded-full transition duration-300 group-hover:shadow-[0_0_12px_#F6C800]"
          />
          <span className="text-xl md:text-2xl font-semibold leading-none select-none">
            <span className="text-[#F6C800] transition duration-300 group-hover:text-white group-hover:drop-shadow-[0_0_6px_#F6C800]">
              Rail
            </span>
            <span className="text-white transition duration-300 group-hover:text-[#F6C800] group-hover:drop-shadow-[0_0_6px_#fff]">
              Eats
            </span>
          </span>
        </Link>

        {/* Desktop nav (optional quick links) + LoginMenu */}
        <nav className="hidden md:flex items-center gap-4">
          {/* Example quick links: edit/remove as per your app */}
          <Link href="/admin" className="text-sm font-medium text-gray-200 hover:text-white transition">
            Dashboard
          </Link>
          <Link href="/admin/orders" className="text-sm font-medium text-gray-200 hover:text-white transition">
            Orders
          </Link>
          <Link href="/admin/outlets" className="text-sm font-medium text-gray-200 hover:text-white transition">
            Outlets
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {/* On desktop LoginMenu remains visible */}
          <div className="hidden md:block">
            <LoginMenu />
          </div>

          {/* Mobile Hamburger */}
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(prev => !prev)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#F6C800] transition"
          >
            {/* simple animated hamburger */}
            <span className="sr-only">Open menu</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                className={`transition-transform duration-200 ${open ? "transform rotate-45 translate-y-0.5" : ""}`}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      <div
        className={`md:hidden w-full bg-black border-t border-gray-800 overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
          open ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
        }`}
        aria-hidden={!open}
      >
        <div className="px-4 pt-4 pb-6 space-y-4">
          {/* mobile nav links */}
          <nav className="flex flex-col gap-2">
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-200 hover:text-white hover:bg-[rgba(255,255,255,0.02)] transition"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/orders"
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-200 hover:text-white hover:bg-[rgba(255,255,255,0.02)] transition"
            >
              Orders
            </Link>
            <Link
              href="/admin/outlets"
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-200 hover:text-white hover:bg-[rgba(255,255,255,0.02)] transition"
            >
              Outlets
            </Link>
            {/* add/remove links as needed */}
          </nav>

          {/* mobile login/menu area */}
          <div>
            <div className="pt-2 border-t border-gray-800 mt-2">
              {/* Show the same LoginMenu, but ensure it renders fine on mobile */}
              <LoginMenu />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
