"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "../lib/useAuth";
import { useRouter } from "next/navigation";
import CartWidget from "./CartWidget";

export default function Navbar() {
  const { user, setUser, logout } = useAuth();
  const router = useRouter();

  // 🔥 PAGE LOAD पर localStorage से user load
  useEffect(() => {
    const saved = localStorage.getItem("raileats_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {}
    }
  }, []);

  return (
    <header className="sticky top-0 z-[9999] w-full bg-black md:bg-transparent">
      <div className="mx-auto max-w-5xl px-4">
        <div
          className="h-14 md:h-16 w-full flex items-center justify-between gap-2
                     md:bg-black md:rounded-b-md md:border-b md:border-gray-800"
        >
          {/* LEFT LOGO */}
          <Link href="/" className="flex items-center gap-2 md:gap-3 group">
            <img
              src="/logo.png"
              alt="RelFood"
              className="h-10 w-10 md:h-12 md:w-12 rounded-full"
            />
            <span className="text-xl md:text-2xl font-semibold leading-none">
              <span className="text-[#F6C800] group-hover:text-white transition duration-300">
                Rail
              </span>
              <span className="text-white group-hover:text-[#F6C800] transition duration-300">
                Eats
              </span>
            </span>
          </Link>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-2">
            {/* Cart (desktop only) */}
            <div className="hidden md:inline-flex">
              <CartWidget />
            </div>

            {/* 🔥 LOGIN / USER */}
            {!user ? (
              <button
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("raileats:open-login")
                  )
                }
                className="bg-white text-black px-3 py-1 rounded"
              >
                Login
              </button>
            ) : (
              <div className="flex items-center gap-2">
                
                {/* ✅ CLICKABLE USER BUTTON */}
                <button
                  onClick={() => router.push("/profile")}
                  className="relative z-[9999] bg-green-600 text-white px-3 py-1 rounded text-sm font-semibold hover:bg-green-700"
                >
                  {user.name && user.name !== ""
                    ? user.name
                    : user.mobile}
                </button>

                {/* LOGOUT */}
                <button
                  onClick={() => {
                    logout();
                    router.replace("/");
                  }}
                  className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
