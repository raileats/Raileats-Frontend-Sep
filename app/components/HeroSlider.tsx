"use client";

import Image from "next/image";
import Slider from "react-slick";

const slides = [
  { id: 1, image: "/slides/happy-new-year.png", text: "Fresh food at your train seat" },
  { id: 2, image: "/slides/offer50.png", text: "Flat Rs 50 OFF on orders above Rs 500" },
  { id: 3, image: "/slides/offer20.png", text: "Flat Rs 20 OFF on orders above Rs 250" },
  { id: 4, image: "/slides/offer-combo.png", text: "Combo meals for every journey" },
  { id: 5, image: "/slides/hot-fresh.png", text: "Hot and fresh delivery" },
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
    adaptiveHeight: false,
    pauseOnHover: true,
    cssEase: "ease-out",
  } as const;

  return (
    <section className="container-app pb-0">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-lg">
        <Slider {...settings}>
          {slides.map((slide, idx) => (
            <div key={slide.id} className="!w-full">
              <div className="relative aspect-[16/7] w-full overflow-hidden bg-black sm:aspect-[16/6]">
                <Image
                  src={slide.image}
                  alt={slide.text}
                  fill
                  priority={idx === 0}
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 760px"
                />

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <span className="inline-flex rounded-full bg-white/95 px-3 py-1 text-xs font-black text-slate-950 shadow">
                    {slide.text}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>
    </section>
  );
}
