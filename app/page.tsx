'use client'
import HeroSlider from "./components/HeroSlider";
import SearchBox from "./components/SearchBox";
import Offers from "./components/Offers";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center">
      {/* Banner */}
      <HeroSlider />

      {/* Search */}
      <SearchBox />

      {/* Offers Section */}
      <Offers />
    </main>
  );
}
