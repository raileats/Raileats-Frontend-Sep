"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// 👇 Slides array – images public folder से लेंगे
const slides = [
  { src: "/Offer20.png", caption: "🎉 Flat ₹20 OFF on Orders Above ₹250" },
  { src: "/Offer50.png", caption: "🔥 Flat ₹50 OFF on Orders Above ₹500" },
];

export default function HeroSlider() {
  const [index, setIndex] = useState(0);

  // Auto slide every 3 sec
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-[300px] md:h-[400px] overflow-hidden bg-yellow-400">
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
            className="object-contain md:object-cover"
            priority={i === index}
          />
          {/* Caption text */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded-lg text-white text-sm md:text-lg shadow-md">
            {slide.caption}
          </div>
        </div>
      ))}

      {/* Dots Indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2">
        {slides.map((_, i) => (
          <span
            key={i}
            onClick={() => setIndex(i)}
            className={`w-3 h-3 rounded-full cursor-pointer ${
              i === index ? "bg-yellow-500" : "bg-gray-400"
            }`}
          ></span>
        ))}
      </div>
    </div>
  );
}
