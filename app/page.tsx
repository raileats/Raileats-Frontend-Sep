"use client";

import Navbar from "./components/Navbar";
import HeroSlider from "./components/HeroSlider";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center">
      {/* Navbar */}
      <Navbar />

      {/* Welcome text */}
      <div className="text-center mt-6">
        <h1 className="text-2xl font-bold text-black">
          Welcome to <span className="text-yellow-600">RailEats.in</span>
        </h1>
        <p className="text-sm text-black mt-1">
          Ab Rail Journey ka Swad Only Raileats ke Saath
        </p>
      </div>

      {/* Slider */}
      <div className="mt-4 w-full">
        <HeroSlider />
      </div>
    </main>
  );
}
