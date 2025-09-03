"use client";

import { useState, useEffect } from "react";

const slides = [
  {
    id: 1,
    text: "🎉 Flat ₹20 OFF on Orders Above ₹250",
    bg: "bg-yellow-400",
  },
  {
    id: 2,
    text: "🔥 Flat ₹50 OFF on Orders Above ₹500",
    bg: "bg-yellow-500",
  },
];

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-40 md:h-48 rounded-lg overflow-hidden shadow-md mt-2">
      {/* Slide */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${
            index === current ? "opacity-100" : "opacity-0"
          } ${slide.bg}`}
        >
          <h2 className="text-lg md:text-2xl font-semibold text-black">
            {slide.text}
          </h2>
        </div>
      ))}

      {/* Indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2">
        {slides.map((_, idx) => (
          <span
            key={idx}
            className={`w-3 h-3 rounded-full ${
              idx === current ? "bg-black" : "bg-gray-400"
            }`}
          ></span>
        ))}
      </div>
    </div>
  );
}
