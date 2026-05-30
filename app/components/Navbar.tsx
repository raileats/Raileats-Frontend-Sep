"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/useAuth";
import CartWidget from "./CartWidget";

export default function Navbar() {
  const user = useAuth((s) => s.user);
  const router = useRouter();

  return (
    <header className="navbar">
      <Link href="/" className="brand-lockup" aria-label="RailEats home">
        <span className="brand-logo">
          <img src="/logo.png" alt="RailEats" />
        </span>
        <span className="brand-text">
          Rail<span>Eats</span>
        </span>
      </Link>

      <div className="nav-actions">
        <div className="hidden md:block">
          <CartWidget />
        </div>

        {!user ? (
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("raileats:open-login"))
            }
            className="nav-login-btn"
          >
            Login
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="nav-user-btn"
          >
            {user?.name || user?.mobile || "User"}
          </button>
        )}
      </div>
    </header>
  );
}
