"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

const slides = [
  { src: "/slides/Offer20.png" },
  { src: "/slides/Offer50.png" },
  { src: "/slides/kitchen.jpg" },
  { src: "/slides/fssai.jpg" },
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
    <div className="relative w-full h-[250px] md:h-[350px] overflow-hidden bg-yellow-400">
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
            alt={`Slide ${i + 1}`}
            fill
            className="object-contain md:object-cover"
            priority={i === index}
          />
        </div>
      ))}

      {/* 🔘 Dots Indicator */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-2">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`w-3 h-3 rounded-full cursor-pointer ${
              i === index ? "bg-black" : "bg-gray-300"
            }`}
            onClick={() => setIndex(i)}
          ></span>
        ))}
      </div>
    </div>
  );
}
