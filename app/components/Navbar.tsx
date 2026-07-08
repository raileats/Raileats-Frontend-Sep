"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/useAuth";
import CartWidget from "./CartWidget";

export default function Navbar() {
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateNavbar = () => {
      const currentY = window.scrollY || 0;
      const scrollingDown = currentY > lastScrollY.current;
      const scrollDistance = Math.abs(currentY - lastScrollY.current);
      const focusedElement = document.activeElement as HTMLElement | null;
      const isTyping =
        focusedElement?.tagName === "INPUT" ||
        focusedElement?.tagName === "TEXTAREA" ||
        focusedElement?.tagName === "SELECT";

      setScrolled(currentY > 8);

      if (currentY < 24 || isTyping) {
        setHidden(false);
      } else if (scrollDistance > 8) {
        setHidden(scrollingDown);
      }

      lastScrollY.current = Math.max(currentY, 0);
      ticking.current = false;
    };

    const onScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateNavbar);
        ticking.current = true;
      }
    };

    lastScrollY.current = window.scrollY || 0;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateNavbar);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateNavbar);
    };
  }, []);

  return (
    <header
      className={`navbar ${hidden ? "navbar-hidden" : ""} ${
        scrolled ? "navbar-scrolled" : ""
      }`}
    >
      <Link
        href="/"
        className="brand-lockup active:scale-95"
        aria-label="RailEats home"
      >
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
