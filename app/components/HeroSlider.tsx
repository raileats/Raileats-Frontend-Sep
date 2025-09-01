"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

const slides = [
  { src: "/slides/Offer20.png", caption: "🎉 Flat ₹20 OFF on Orders Above ₹250" },
  { src: "/slides/Offer50.png", caption: "🔥 Flat ₹50 OFF on Orders Above ₹500" },
  { src: "/slides/fssai.jpg", caption: "✅ FSSAI Approved | Vendor Verified" },
];

export default function HeroSlider() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-[300px] md:h-[400px] bg-yellow-400 flex flex-col items-center justify-center overflow-hidden">
      {/* Welcome Text */}
      <div className="absolute top-6 text-center z-10">
        <h1 className="text-2xl md:text-3xl font-bold text-black">Welcome to RailEats.in</h1>
        <p className="text-sm md:text-base text-black mt-1">Ab Rail Journey ka Swad Only RailEats ke Saath</p>
      </div>

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
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded-md text-white text-sm md:text-lg">
            {slide.caption}
          </div>
        </div>
      ))}

      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2">
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
