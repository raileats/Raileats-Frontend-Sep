"use client";

import HeroSlider from "./components/HeroSlider";
import SearchBox from "./components/SearchBox";
import Offers from "./components/Offers";
import Steps from "./components/Steps";
import ExploreRailInfo from "./components/ExploreRailInfo";
import BottomNav from "./components/BottomNav";

export default function HomePage() {
  return (
    <main>
      {/* ✅ Welcome Section */}
      <section className="text-center mt-6 mb-4">
        <h1 className="text-2xl font-bold">
          Welcome to <span className="text-yellow-600">RailEats.in</span>
        </h1>
        <p className="text-gray-700 text-sm">
          Ab Rail Journey ka Swad Only Raileats ke Saath
        </p>
      </section>

      {/* ✅ Hero Slider */}
      <HeroSlider />

      {/* ✅ Search Section */}
      <SearchBox />

      {/* ✅ Offers Section */}
      <Offers />

      {/* ✅ Steps Section */}
      <Steps />

      {/* ✅ Railway Info */}
      <ExploreRailInfo />

      {/* ✅ Mobile Bottom Nav */}
      <BottomNav />

      {/* ✅ Footer */}
      <footer className="bg-black text-white text-center py-4 mt-10 text-sm">
        © 2025 <span className="text-yellow-400">RailEats.in</span> | Fresh Food on Trains
      </footer>
    </main>
  );
}
