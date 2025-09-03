// app/components/HeroSlider.tsx
"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

const slides = [
  {
    id: 1,
    img: "/offer20.png", // public/offer20.png
    text: "🎉 Flat ₹20 OFF on Orders Above ₹250",
  },
  {
    id: 2,
    img: "/offer50.png", // public/offer50.png
    text: "🔥 Flat ₹50 OFF on Orders Above ₹500",
  },
];

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4000); // 4 sec auto slide
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-4xl mx-auto mt-6 rounded-xl overflow-hidden shadow-lg bg-yellow-400">
      {/* Slide Image */}
      <div className="relative w-full h-56 sm:h-72 flex items-center justify-center bg-yellow-400">
        <Image
          src={slides[current].img}
          alt={slides[current].text}
          width={500}
          height={200}
          className="object-contain"
        />
      </div>

      {/* Slide Text */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white text-sm px-4 py-2 rounded-full shadow-md">
        {slides[current].text}
      </div>

      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2.5 h-2.5 rounded-full ${
              current === i ? "bg-yellow-400" : "bg-gray-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
