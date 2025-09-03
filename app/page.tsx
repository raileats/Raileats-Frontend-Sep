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

      {/* 🎉 Hero Section */}
      <section className="relative">
        <HeroSlider />

        {/* Welcome Text */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-black bg-yellow-400 px-4 py-2 rounded-lg shadow-md">
            Welcome to RailEats.in
          </h1>
          <p className="text-sm md:text-base text-black mt-2">
            Ab Rail Journey ka Swad Only RailEats ke Saath
          </p>
        </div>
      </section>

      {/* 🔍 Search Section */}
      <section className="mt-8 px-4">
        <SearchBox />
      </section>

      {/* 🎁 Offers Section */}
      <section className="mt-12 px-4">
        <Offers />
      </section>

      {/* 📦 Steps Section */}
      <section className="mt-12 px-4">
        <Steps />
      </section>

      {/* 🚉 Explore Railway Info */}
      <section className="mt-12 px-4 mb-20">
        <ExploreRailInfo />
      </section>

      {/* 📱 Bottom Nav (Mobile only) */}
      <BottomNav />
    </main>
  );
}
