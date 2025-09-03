"use client";

import HeroSlider from "./components/HeroSlider";
import SearchBox from "./components/SearchBox";
import Offers from "./components/Offers";
import Steps from "./components/Steps";
import ExploreRailInfo from "./components/ExploreRailInfo";

export default function HomePage() {
  return (
    <main className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <section className="w-full max-w-5xl mx-auto">
        <HeroSlider />

        {/* Welcome Text */}
        <div className="text-center mt-4">
          <h1 className="text-2xl font-bold">
            Welcome to <span className="text-yellow-600">RailEats.in</span>
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Ab Rail Journey ka Swad Only RailEats ke Saath
          </p>
        </div>

        {/* Search Section */}
        <div className="mt-6 px-3">
          <SearchBox />
        </div>
      </section>

      {/* Offers Section */}
      <section className="mt-8 w-full max-w-5xl mx-auto px-3">
        <Offers />
      </section>

      {/* Steps Section */}
      <section className="mt-10 w-full max-w-5xl mx-auto px-3">
        <Steps />
      </section>

      {/* Explore Railway Info */}
      <section className="mt-10 w-full max-w-5xl mx-auto px-3 mb-16">
        <ExploreRailInfo />
      </section>
    </main>
  );
}
