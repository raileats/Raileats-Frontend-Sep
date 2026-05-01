"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/useAuth";
import CartWidget from "./CartWidget";

export default function Navbar() {
  const user = useAuth((s) => s.user);
  const router = useRouter();

  return (
    <header className="navbar flex items-center justify-between px-4 py-2">

      {/* 🔹 LEFT: LOGO */}
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

      {/* 🔹 RIGHT */}
      <div className="flex items-center gap-2">

        {/* Cart */}
        <div className="hidden md:block">
          <CartWidget />
        </div>

        {/* 🔥 AUTH UI */}
        {!user ? (
          /* ✅ LOGIN (NOT LOGGED IN) */
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
          /* ✅ USER NAME (LOGGED IN) */
          <button
            onClick={() => router.push("/profile")}
            className="bg-green-600 text-white px-3 py-1 rounded text-sm"
          >
            {user?.name || user?.mobile || "User"}
          </button>
        )}

      </div>
    </header>
  );
}
