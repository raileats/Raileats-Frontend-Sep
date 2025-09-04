"use client";
import React from "react";
import Slider from "react-slick";
import Image from "next/image";

const slides = [
  { id: 1, image: "/slides/offer50.png", text: "Flat ₹50 OFF on Orders Above ₹500" },
  { id: 2, image: "/slides/offer20.png", text: "Flat ₹20 OFF on Orders Above ₹250" },
  { id: 3, image: "/slides/offer-combo.png", text: "Combo Deals • Fresh & Fast" },
];

export default function HeroSlider() {
  const settings = {
    dots: true,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 3500,
    speed: 600,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    centerMode: false,
    variableWidth: false,
    adaptiveHeight: true,
  } as const;

  return (
    <div className="w-screen md:w-full md:max-w-6xl mx-auto mt-4 overflow-hidden">
      <Slider {...settings}>
        {slides.map((slide) => (
          <div key={slide.id} className="!w-full">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl shadow-lg bg-black">
              <Image
                src={slide.image}
                alt={slide.text}
                fill
                className="object-contain"
                priority
              />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1.5 rounded-md text-xs md:text-sm">
                {slide.text}
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}
