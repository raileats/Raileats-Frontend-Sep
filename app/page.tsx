// app/page.tsx
"use client";

import HeroSlider from "./components/HeroSlider";
import SearchBox from "./components/SearchBox";
import Offers from "./components/Offers";
import Steps from "./components/Steps";
import ExploreRailInfo from "./components/ExploreRailInfo";

export default function HomePage() {
  return (
    <div className="px-4">
      {/* Hero Section */}
      <section className="text-center py-6">
        <h1 className="text-2xl font-bold">
          Welcome to <span className="text-yellow-600">RailEats.in</span>
        </h1>
        <p className="text-gray-600 text-sm">
          Ab Rail Journey ka Swad Only RailEats ke Saath
        </p>
      </section>

      <HeroSlider />
      <SearchBox />
      <Offers />
      <Steps />
      <ExploreRailInfo />

      <footer className="bg-black text-white text-center py-4 mt-10 text-sm rounded-t-lg">
        © 2025 <span className="text-yellow-400">RailEats.in</span> | Fresh Food on Trains
      </footer>
    </div>
  );
}
