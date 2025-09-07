"use client";

import Link from "next/link";
import LoginMenu from "./LoginMenu";

export default function Navbar() {
  return (
    /*
      Behavior:
      - Mobile: header has bg-black so the bar is full-width.
      - Desktop (md+): header becomes transparent and inner container gets md:bg-black,
        which keeps the black bar limited to max-w-5xl and centered.
    */
    <header className="sticky top-0 z-50 w-full bg-black md:bg-transparent">
      {/* Site container — controls centered max width on desktop, still has px on mobile */}
      <div className="mx-auto max-w-5xl px-4">
        {/* 
          - On mobile this inner row will sit on header's black background (full-width black).
          - On md+, this row itself will get the black background and rounded/border styling,
            so it becomes the centered black bar.
        */}
        <div className="h-14 md:h-16 w-full flex items-center justify-between gap-2
                        md:bg-black md:rounded-b-md md:border-b md:border-gray-800">
          {/* Left: Logo + Brand */}
          <Link href="/" className="flex items-center gap-2 md:gap-3 group">
            <img
              src="/logo.png"
              alt="RelFood"
              className="h-10 w-10 md:h-12 md:w-12 rounded-full animate-bubbleGlow"
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

          {/* Right: Login / User Menu */}
          <div>
            <LoginMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
