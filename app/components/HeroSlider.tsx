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

  // Auto slide every 2 sec
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-[250px] overflow-hidden bg-black">
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
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded text-white text-sm shadow">
            {slide.caption}
          </div>
        </div>
      ))}

      {/* 🔘 Dots Indicator */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex space-x-2">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`w-2.5 h-2.5 rounded-full cursor-pointer ${
              i === index ? "bg-yellow-400" : "bg-gray-400"
            }`}
            onClick={() => setIndex(i)}
          ></span>
        ))}
      </div>
    </div>
  );
}
