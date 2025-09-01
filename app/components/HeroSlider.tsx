"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

const slides = [
  { src: "/Offer20.png", caption: "🎉 Flat ₹20 OFF on Orders Above ₹250" },
  { src: "/Offer50.png", caption: "🔥 Flat ₹50 OFF on Orders Above ₹500" },
];

export default function HeroSlider() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-[250px] bg-yellow-400 flex flex-col items-center justify-center overflow-hidden">
      {/* ✅ Welcome Text */}
      <div className="absolute top-4 text-center z-20">
        <h1 className="text-2xl font-bold text-black">Welcome to RailEats.in</h1>
        <p className="text-sm text-black mt-1">
          Ab Rail Journey ka Swad Only RailEats ke Saath
        </p>
      </div>

      {/* ✅ Slides */}
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
            className="object-contain"
            priority={i === index}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded-lg text-white text-sm">
            {slide.caption}
          </div>
        </div>
      ))}

      {/* ✅ Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full cursor-pointer ${
              i === index ? "bg-yellow-500" : "bg-gray-300"
            }`}
            onClick={() => setIndex(i)}
          ></span>
        ))}
      </div>
    </div>
  );
}
