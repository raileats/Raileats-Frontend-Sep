"use client";
import Image from "next/image";

export default function HeroSlider() {
  return (
    <div className="w-full bg-yellow-400 flex flex-col items-center justify-center text-center py-6">
      <div className="max-w-5xl w-full px-4">
        <div className="relative w-full h-52 md:h-64 overflow-hidden rounded-lg shadow-md">
          <Image
            src="/train-banner.png"
            alt="Train Banner"
            fill
            className="object-cover"
            priority
          />
        </div>
        <h2 className="mt-4 text-2xl md:text-3xl font-bold text-black">
          Order Restaurant Food on Trains Online
        </h2>
        <p className="text-gray-800 mt-1">
          Fresh Food from trusted restaurants with hygiene & timely delivery
        </p>
      </div>
    </div>
  );
}
