"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

const slides = [
  { src: "/slides/restaurant.jpg", caption: "🍲 Delicious Meals Onboard" },
  { src: "/slides/kitchen.jpg", caption: "👨‍🍳 Hygienic & Verified Kitchens" },
  { src: "/slides/fssai.jpg", caption: "✅ FSSAI Approved | Vendor Verified" },
];

export default function HeroSlider() {
  const [index, setIndex] = useState(0);

  // Auto slide every 2 sec
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-[400px] overflow-hidden bg-black">
      {/* Slides */}
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={slide.src}
            alt={slide.caption}
            fill
            className="object-cover"
            priority={i === index}
          />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-lg text-white text-lg shadow-md">
            {slide.caption}
          </div>
        </div>
      ))}

      {/* 🔘 Dots Indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`w-3 h-3 rounded-full cursor-pointer ${
              i === index ? "bg-yellow-400" : "bg-gray-400"
            }`}
            onClick={() => setIndex(i)} // click पर भी slide बदलेगा
          ></span>
        ))}
      </div>
    </div>
  );
}
