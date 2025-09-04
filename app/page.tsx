"use client";

import HeroSlider from "./components/HeroSlider";
import SearchBox from "./components/SearchBox";
import Offers from "./components/Offers";
import Steps from "./components/Steps";
import ExploreRailInfo from "./components/ExploreRailInfo";

export default function HomePage() {
  return (
    <main className="bg-gray-50 min-h-screen">
      {/* Welcome Strip (Yellow Bar) */}
      <div className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black py-3">
        <div className="mx-auto max-w-screen-xl px-4 text-center">
          <h1 className="text-lg md:text-xl font-bold">
            Welcome to <span className="font-extrabold">RailEats.in</span>
          </h1>
          <p className="text-sm md:text-base mt-1 font-medium">
            Ab Rail Journey ka Swad Only <span className="font-semibold">RailEats</span> ke Saath
          </p>
        </div>
      </div>

      {/* Hero Section (slider) */}
      <section className="w-full max-w-5xl mx-auto mt-0">
        <HeroSlider />
      </section>

      {/* Search Section */}
      <section className="mt-4 px-3 max-w-5xl mx-auto">
        <SearchBox />
      </section>

      {/* Offers Section */}
      <section className="mt-6 w-full max-w-5xl mx-auto px-3">
        <Offers />
      </section>

      {/* Steps Section */}
      <section className="mt-6 w-full max-w-5xl mx-auto px-3">
        <Steps />
      </section>

      {/* Explore Railway Info */}
      <section className="mt-6 w-full max-w-5xl mx-auto px-3 mb-16">
        <ExploreRailInfo />
      </section>
    </main>
  );
}
