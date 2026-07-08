"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../lib/useAuth";
import CartWidget from "./CartWidget";

function getInnerPageTitle(pathname: string) {
  if (pathname.startsWith("/stations/")) return "Restaurants";
  if (pathname.startsWith("/trains/")) return "Train Food";
  if (pathname.startsWith("/pnr-status")) return "PNR Status";
  if (pathname.startsWith("/live-train-status")) return "Train Status";
  if (pathname.startsWith("/profile")) return "Profile";
  if (pathname.startsWith("/orders")) return "Orders";
  if (pathname.startsWith("/cart")) return "Cart";
  if (pathname.startsWith("/menu")) return "Menu";
  if (pathname.startsWith("/popular-restaurants")) return "Popular Restaurants";

  const clean = pathname
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.replace(/-/g, " ")
    .trim();

  if (!clean) return "RailEats";

  return clean.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Navbar() {
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const pathname = usePathname() || "/";
  const isHomePage = pathname === "/";
  const pageTitle = useMemo(() => getInnerPageTitle(pathname), [pathname]);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const scrollStopTimer = useRef<number | null>(null);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const showAfterScrollStops = () => {
      if (scrollStopTimer.current !== null) {
        window.clearTimeout(scrollStopTimer.current);
      }

      scrollStopTimer.current = window.setTimeout(() => {
        const focusedElement = document.activeElement as HTMLElement | null;
        const isTyping =
          focusedElement?.tagName === "INPUT" ||
          focusedElement?.tagName === "TEXTAREA" ||
          focusedElement?.tagName === "SELECT";

        if (!isTyping) setHidden(false);
      }, 420);
    };

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
      showAfterScrollStops();
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
      if (scrollStopTimer.current !== null) {
        window.clearTimeout(scrollStopTimer.current);
      }

      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateNavbar);
    };
  }, []);

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  if (!isHomePage) {
    return (
      <header
        className={`navbar inner-navbar ${hidden ? "navbar-hidden" : ""} ${
          scrolled ? "navbar-scrolled" : ""
        }`}
      >
        <button
          type="button"
          onClick={goBack}
          className="inner-back-button active:scale-95"
          aria-label="Go back"
        >
          <ArrowLeft size={22} strokeWidth={2.8} />
        </button>

        <div className="inner-page-title" aria-label={pageTitle}>
          {pageTitle}
        </div>

        <Link href="/" className="inner-home-logo active:scale-95" aria-label="RailEats home">
          <Image
            src="/logo.png"
            alt="RailEats"
            width={34}
            height={34}
            priority
            unoptimized
          />
        </Link>
      </header>
    );
  }

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
