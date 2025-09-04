"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import HeroSlider from "./components/HeroSlider";
import SearchBox from "./components/SearchBox";
import Offers from "./components/Offers";
import Steps from "./components/Steps";
import ExploreRailInfo from "./components/ExploreRailInfo";
import FooterLinks from "./components/FooterLinks";

export default function HomePage() {
  const search = useSearchParams();

  useEffect(() => {
    if (search.get("goto") === "offers") {
      const el = document.getElementById("offers");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [search]);

  return (
    <main className="bg-gray-50 min-h-screen">
      {/* Welcome strip (no top gap) */}
      <div className="welcome-strip w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black py-3 mt-0">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <h1 className="text-lg md:text-xl font-bold">
            Welcome to <span className="font-extrabold">RailEats.in</span>
          </h1>
          <p className="text-sm md:text-base mt-1 font-medium">
            Ab Rail Journey ka Swad Only <span className="font-semibold">RailEats</span> ke Saath
          </p>
        </div>
      </div>

      {/* Hero Section — a bit narrower on mobile for better look */}
      <section className="w-full max-w-5xl mx-auto mt-0 px-3 md:px-0">
        <HeroSlider />
      </section>

      {/* Search Section */}
      <section className="mt-4 px-3 max-w-5xl mx-auto">
        <SearchBox />
      </section>

      {/* ⬇️ Trains Information just after search */}
      <section className="mt-4 w-full max-w-5xl mx-auto px-3">
        <ExploreRailInfo />
      </section>

      {/* Offers Section (moved below ExploreRailInfo) */}
      <section id="offers" className="mt-6 w-full max-w-5xl mx-auto px-3 scroll-mt-16">
        <Offers />
      </section>

      {/* Steps Section */}
      <section className="mt-6 w-full max-w-5xl mx-auto px-3">
        <Steps />
      </section>

      {/* Footer links / misc */}
      <section className="mt-8 w-full max-w-5xl mx-auto px-3 mb-16">
        <FooterLinks />
      </section>
    </main>
  );
}
