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
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [search]);

  return (
    <main className="bg-gray-50 min-h-screen pt-0">
      {/* ============== DESKTOP CONTAINER ============== */}
      <div className="mx-auto w-full md:max-w-4xl md:px-6">

        {/* Welcome Strip */}
        <div className="mt-0">
          <div className="md:rounded-lg md:bg-gradient-to-r md:from-yellow-400 md:via-yellow-500 md:to-yellow-600 md:text-black md:py-3 md:px-6">
            <div className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black py-3 md:bg-none md:py-0">
              <div className="mx-auto max-w-full px-4 text-center">
                <h1 className="text-lg md:text-xl font-bold">
                  Welcome to <span className="font-extrabold">RailEats.in</span>
                </h1>
                <p className="text-sm md:text-base mt-1 font-medium">
                  Ab Rail Journey ka Swad Only{" "}
                  <span className="font-semibold">RailEats</span> ke Saath
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Slider */}
        <section className="mt-3 px-3 md:px-0">
          <HeroSlider />
        </section>

        {/* 🔑 SEARCH BOX (PNR FLOW YAHI SE START HOGA) */}
        <section className="mt-4 px-3 md:px-0">
          <SearchBox />
        </section>

        {/* Explore Railway Info */}
        <section className="mt-4 px-3 md:px-0">
          <ExploreRailInfo />
        </section>

        {/* Offers */}
        <section id="offers" className="mt-6 px-3 md:px-0 scroll-mt-16">
          <Offers />
        </section>

        {/* Steps */}
        <section className="mt-6 px-3 md:px-0">
          <Steps />
        </section>

        {/* Footer */}
        <section className="mt-8 px-3 md:px-0 mb-16">
          <FooterLinks />
        </section>
      </div>
    </main>
  );
}
