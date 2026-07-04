"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/useAuth";
import CartWidget from "./CartWidget";

export default function Navbar() {
  const user = useAuth((s) => s.user);
  const router = useRouter();

  return (
    <header className="navbar">
      <Link href="/" className="brand-lockup active:scale-95" aria-label="RailEats home">
        <span className="brand-logo">
          <Image
            src="/logo.png"
            alt="RailEats"
            width={42}
            height={42}
            priority
            unoptimized
          />
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
            className="nav-login-btn active:scale-95"
          >
            Login
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="nav-user-btn active:scale-95"
          >
            {user?.name || user?.mobile || "User"}
          </button>
        )}
      </div>
    </header>
  );
}
