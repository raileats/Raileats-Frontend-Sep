"use client";

import { useState } from "react";
import Image from "next/image";

const slides = [
  { src: "/slides/Offer20.png", caption: "🎉 Flat ₹20 OFF on Orders Above ₹250" },
  { src: "/slides/Offer50.png", caption: "🔥 Flat ₹50 OFF on Orders Above ₹500" },
];

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);

  return (
    <div className="relative w-full max-w-5xl mx-auto overflow-hidden rounded-lg shadow-md">
      <Image
        src={slides[current].src}
        alt={slides[current].caption}
        width={1200}
        height={400}
        className="w-full h-64 object-cover"
      />
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-1 rounded-lg text-sm">
        {slides[current].caption}
      </div>
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`w-3 h-3 rounded-full ${
              current === idx ? "bg-yellow-400" : "bg-gray-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
