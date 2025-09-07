"use client";

import Link from "next/link";
import LoginMenu from "./LoginMenu";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-transparent border-b">
      {/* Inner centered bar - this is the visible black bar limited to max-w-5xl */}
      <div className="mx-auto w-full max-w-5xl px-4">
        <div
          className="h-14 md:h-16 flex items-center justify-between gap-2
                     bg-black rounded-b-md"
          style={{ paddingLeft: 8, paddingRight: 8 }}
        >
          {/* Left: Logo + Brand */}
          <Link href="/" className="flex items-center gap-2 md:gap-3 group" aria-label="RailEats Home">
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

          {/* Right: only LoginMenu (no center tabs) */}
          <div className="flex items-center gap-3">
            <div>
              <LoginMenu />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
