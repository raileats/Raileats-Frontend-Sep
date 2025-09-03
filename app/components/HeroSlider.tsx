"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const slides = [
  {
    id: 1,
    src: "/offer20.png",
    alt: "Flat ₹20 OFF on Orders Above ₹250",
  },
  {
    id: 2,
    src: "/offer50.png",
    alt: "Flat ₹50 OFF on Orders Above ₹500",
  },
  {
    id: 3,
    src: "/fssai-kitchen.jpg", // ✅ add FSSAI Approved kitchen image
    alt: "FSSAI Approved Hygienic Restaurant Kitchens",
  },
  {
    id: 4,
    src: "/deliveryboy.png", // ✅ add delivery boy delivering food
    alt: "RailEats Delivery – Fast & Hygienic",
  },
];

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full flex justify-center mt-4">
      <div className="relative w-full max-w-6xl h-64 md:h-96 overflow-hidden rounded-xl shadow-lg">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === current ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              layout="fill"
              objectFit="cover"
              className="rounded-xl"
              priority={index === current}
            />
            {/* Caption */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm md:text-lg shadow-md">
              {slide.alt}
            </div>
          </div>
        ))}

        {/* Dots */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {slides.map((_, index) => (
            <span
              key={index}
              className={`w-3 h-3 rounded-full ${
                index === current ? "bg-yellow-500" : "bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
