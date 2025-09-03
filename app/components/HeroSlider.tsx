"use client";
import React from "react";
import Slider from "react-slick";
import Image from "next/image";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const slides = [
  {
    id: 1,
    image: "/slides/offer50.png",
    text: "Flat ₹50 OFF on Orders Above ₹500",
  },
  {
    id: 2,
    image: "/slides/offer20.png",
    text: "Flat ₹20 OFF on Orders Above ₹250",
  },
  {
    id: 3,
    image: "/slides/fssai-kitchen.png",
    text: "FSSAI Approved Hygienic Restaurant Kitchens",
  },
  {
    id: 4,
    image: "/slides/deliveryboy.png",
    text: "RailEats Delivery – Fast & Hygienic",
  },
];

export default function HeroSlider() {
  const settings = {
    dots: true,
    infinite: true,
    autoplay: true,
    speed: 800,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    appendDots: (dots: React.ReactNode) => (
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <ul className="flex gap-2">{dots}</ul>
      </div>
    ),
    customPaging: () => (
      <div className="w-3 h-3 bg-gray-300 rounded-full hover:bg-yellow-400 transition-colors" />
    ),
  };

  return (
    <div className="w-full max-w-6xl mx-auto mt-4 relative">
      <Slider {...settings}>
        {slides.map((slide) => (
          <div key={slide.id} className="w-full">
            <div className="relative rounded-xl overflow-hidden shadow-lg aspect-[16/9]">
              <Image
                src={slide.image}
                alt={slide.text}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-lg text-sm md:text-lg">
                {slide.text}
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}
