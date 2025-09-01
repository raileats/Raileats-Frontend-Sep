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
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative w-full bg-yellow-400">
      {/* Welcome Text */}
      <div className="absolute top-4 w-full text-center z-10">
        <h1 className="text-2xl font-bold">Welcome to RailEats.in</h1>
        <p className="text-sm">Ab Rail Journey ka Swad Only Raileats ke Saath</p>
      </div>

      {/* Slides */}
      <div className="relative w-full h-[300px] md:h-[400px] overflow-hidden">
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
              className="object-contain bg-yellow-400"
              priority={i === index}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-lg text-sm md:text-base">
              {slide.caption}
            </div>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <span
            key={i}
            onClick={() => setIndex(i)}
            className={`w-3 h-3 rounded-full cursor-pointer ${
              i === index ? "bg-white" : "bg-gray-400"
            }`}
          ></span>
        ))}
      </div>
    </section>
  );
}
