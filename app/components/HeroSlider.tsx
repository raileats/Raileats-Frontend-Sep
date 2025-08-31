"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

const slides = [
  { src: "/slides/Offer20.png", caption: "" },
  { src: "/slides/Offer50.png", caption: "" },
  { src: "/slides/fssai.jpg", caption: "" },
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
    <div className="relative w-full h-[300px] overflow-hidden bg-black flex items-center justify-center">
      {/* Slides */}
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={slide.src}
            alt="RailEats Banner"
            fill
            className="object-contain bg-black" // cut nahi hoga
            priority={i === index}
          />
        </div>
      ))}

      {/* 🔥 Overlay Heading - Fixed Text */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center z-10">
        <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
          Welcome to Raileats.in
        </h1>
        <p className="mt-1 text-sm md:text-base text-gray-200 drop-shadow">
          Ab Rail Journey ka Swad Only Raileats ke Saath
        </p>
      </div>

      {/* 🔘 Dots Indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`w-3 h-3 rounded-full cursor-pointer ${
              i === index ? "bg-yellow-400" : "bg-gray-400"
            }`}
            onClick={() => setIndex(i)}
          ></span>
        ))}
      </div>
    </div>
  );
}
