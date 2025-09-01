"use client";
import HeroSlider from "./components/HeroSlider";

export default function Home() {
  return (
    <main>
      <HeroSlider />

      {/* Search Section */}
      <div className="mt-8 w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-4 justify-center px-4">
        {/* PNR */}
        <div className="flex flex-col w-full md:w-1/3">
          <input
            type="text"
            placeholder="Enter PNR Number"
            className="px-4 py-2 border border-gray-400 rounded-t-md"
          />
          <button className="bg-black text-white px-4 py-2 rounded-b-md">
            Search by PNR
          </button>
        </div>

        {/* Station */}
        <div className="flex flex-col w-full md:w-1/3">
          <input
            type="text"
            placeholder="Enter Station Code"
            className="px-4 py-2 border border-gray-400 rounded-t-md"
          />
          <button className="bg-black text-white px-4 py-2 rounded-b-md">
            Search by Station
          </button>
        </div>

        {/* Train */}
        <div className="flex flex-col w-full md:w-1/3">
          <input
            type="text"
            placeholder="Enter Train Number"
            className="px-4 py-2 border border-gray-400 rounded-t-md"
          />
          <button className="bg-black text-white px-4 py-2 rounded-b-md">
            Search by Train
          </button>
        </div>
      </div>
    </main>
  );
}
