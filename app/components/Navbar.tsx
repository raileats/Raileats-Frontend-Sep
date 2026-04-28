"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "../lib/useAuth";
import CartWidget from "./CartWidget";

export default function Navbar() {
  const { user, setUser, logout } = useAuth();

  useEffect(() => {
    const saved = localStorage.getItem("raileats_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {}
    }
  }, []);

  return (
    <header className="navbar">
      
      {/* ✅ LEFT: LOGO + NAME (ONLY THIS, NO BIG IMAGE) */}
      <Link href="/" className="flex items-center gap-2">
        <img
          src="/logo.png"
          alt="RailEats"
          className="h-8 w-8 object-contain"
        />
        <span className="font-semibold text-lg text-yellow-500">
          Rail<span className="text-black">Eats</span>
        </span>
      </Link>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-2">

        {/* Desktop Cart */}
        <div className="hidden md:block">
          <CartWidget />
        </div>

        {/* LOGIN / USER */}
        {!user ? (
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("raileats:open-login")
              )
            }
            className="bg-black text-white px-3 py-1 rounded text-sm"
          >
            Login
          </button>
        ) : (
          <div className="flex items-center gap-2">

            {/* 🔥 USER NAME CLICKABLE */}
            <button
              onClick={() => window.location.href = "/profile"}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm"
            >
              {user.name || user.mobile}
            </button>

            {/* LOGOUT */}
            <button
              onClick={() => logout()}
              className="bg-red-500 text-white px-2 py-1 rounded text-xs"
            >
              Logout
            </button>

          </div>
        )}

      </div>
    </header>
  );
}
