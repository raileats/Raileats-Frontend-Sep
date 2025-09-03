"use client";
import React from "react";
import Slider from "react-slick";
import Image from "next/image";

const slides = [
  {
    id: 1,
    image: "/slides/offer50.png",
    text: "Flat ₹50 OFF on Orders Above ₹500",
  },
  {
    id: 1,
    image: "/slides/offer20.png",
    text: "Flat ₹20 OFF on Orders Above ₹250",
  },
  {
    id: 2,
    image: "/slides/fssai-kitchen.png",
    text: "FSSAI Approved Hygienic Restaurant Kitchens",
  },
  {
    id: 3,
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
  };

  return (
    <div className="w-full max-w-6xl mx-auto mt-4">
      <Slider {...settings}>
        {slides.map((slide) => (
          <div key={slide.id} className="px-2">
            <div className="relative rounded-xl overflow-hidden shadow-lg aspect-[16/9] bg-black">
              <Image
                src={slide.image}
                alt={slide.text}
                fill
                className="object-contain bg-black"
                priority
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg text-sm md:text-lg">
                {slide.text}
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}
