"use client";

import Navbar from "./components/Navbar";
import HeroSlider from "./components/HeroSlider";
import SearchBox from "./components/SearchBox";
import Offers from "./components/Offers";
import Steps from "./components/Steps";
import ExploreRailInfo from "./components/ExploreRailInfo";
import BottomNav from "./components/BottomNav";

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* 🔝 Navbar */}
      <Navbar />

      {/* 🟡 Welcome text (only once) */}
      <section className="text-center bg-yellow-400 py-6">
        <h1 className="text-2xl md:text-3xl font-bold">Welcome to RailEats.in</h1>
        <p className="text-md md:text-lg mt-2">
          Ab Rail Journey ka Swad Only RailEats ke Saath!
        </p>
      </section>

      {/* 🎉 Hero Slider */}
      <HeroSlider />

      {/* 🔍 Search Box */}
      <SearchBox />

      {/* 💰 Offers */}
      <Offers />

      {/* 🚉 Order Steps */}
      <Steps />

      {/* 📊 Explore Rail Info */}
      <ExploreRailInfo />

      {/* 📱 Bottom Navigation (for mobile) */}
      <BottomNav />
    </main>
  );
}
