"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

export type HeroSlide = {
  id: number | string;
  title: string | null;
  image_url: string;
  sort_order?: number | null;
};

type HeroSliderProps = {
  initialSlides?: HeroSlide[];
};

const fallbackSlides: HeroSlide[] = [
  {
    id: "fallback-happy-new-year",
    title: "Fresh food at your train seat",
    image_url: "/slides/happy-new-year.png",
    sort_order: 1,
  },
  {
    id: "fallback-offer50",
    title: "Flat Rs 50 OFF on orders above Rs 500",
    image_url: "/slides/offer50.png",
    sort_order: 2,
  },
  {
    id: "fallback-offer20",
    title: "Flat Rs 20 OFF on orders above Rs 250",
    image_url: "/slides/offer20.png",
    sort_order: 3,
  },
];

const EMPTY_SLIDES: HeroSlide[] = [];

export default function HeroSlider({
  initialSlides = EMPTY_SLIDES,
}: HeroSliderProps) {
  const slides = useMemo(() => {
    const source = initialSlides.length > 0 ? initialSlides : fallbackSlides;
    const validSlides = source
      .filter((slide) => Boolean(slide?.image_url))
      .slice()
      .sort(
        (a, b) =>
          Number(a.sort_order ?? 999) - Number(b.sort_order ?? 999)
      );

    return validSlides.length > 0 ? validSlides : fallbackSlides;
  }, [initialSlides]);

  const [currentIndex, setCurrentIndex] = useState(0);

  const activeSlide = slides[currentIndex] || slides[0];
  const activeText =
    activeSlide?.title || "RailEats train food delivery";

  return (
    <section
      className="container-app !pt-3 pb-0"
      aria-label="RailEats offers and highlights"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-lg">
        <div
          className="relative aspect-[16/8] w-full overflow-hidden bg-black sm:aspect-[16/7] lg:aspect-[16/6.8]"
          aria-live="off"
        >
          <Image
            key={activeSlide.id || activeSlide.image_url}
            src={activeSlide.image_url}
            alt={activeText}
            title={activeText}
            fill
            priority={currentIndex === 0}
            fetchPriority={currentIndex === 0 ? "high" : "auto"}
            loading={currentIndex === 0 ? "eager" : "lazy"}
            decoding="async"
            quality={55}
            className="object-cover"
            sizes="(max-width: 767px) calc(100vw - 24px), (max-width: 1279px) calc(100vw - 48px), 1120px"
          />

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4">
            <span className="inline-flex rounded-full bg-white/95 px-3 py-1 text-xs font-black text-slate-950 shadow">
              {activeText}
            </span>
          </div>
        </div>

        {slides.length > 1 && (
          <div
            className="flex items-center justify-center bg-black/90 px-3"
            aria-label="Select a RailEats offer"
          >
            {slides.map((slide, index) => (
              <button
                key={slide.id || `${slide.image_url}-${index}`}
                type="button"
                onClick={() => setCurrentIndex(index)}
                aria-label={`Show offer ${index + 1}: ${
                  slide.title || "RailEats offer"
                }`}
                aria-current={index === currentIndex ? "true" : undefined}
                className="group inline-flex h-11 w-11 items-center justify-center rounded-full"
              >
                <span
                  aria-hidden="true"
                  className={`h-2.5 rounded-full transition-[width,background-color] ${
                    index === currentIndex
                      ? "w-7 bg-white"
                      : "w-2.5 bg-white/50 group-hover:bg-white/80"
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
