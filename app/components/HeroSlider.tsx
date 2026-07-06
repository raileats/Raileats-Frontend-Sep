"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Slider from "react-slick";

type HeroSlide = {
  id: number | string;
  title: string | null;
  image_url: string;
  sort_order?: number | null;
};

type HeroSliderApiResponse = {
  success: boolean;
  data?: HeroSlide[];
  error?: string;
};

const HERO_SLIDER_API = "https://admin.raileats.in/api/hero-slider";

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
  {
    id: "fallback-offer-combo",
    title: "Combo meals for every journey",
    image_url: "/slides/offer-combo.png",
    sort_order: 4,
  },
  {
    id: "fallback-hot-fresh",
    title: "Hot and fresh delivery",
    image_url: "/slides/hot-fresh.png",
    sort_order: 5,
  },
];

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

export default function HeroSlider() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadSlidesFromAdminCms() {
      try {
        const response = await fetch(HERO_SLIDER_API, {
          method: "GET",
          cache: "no-store",
          mode: "cors",
        });

        const result = (await response.json()) as HeroSliderApiResponse;

        if (ignore) return;

        if (
          response.ok &&
          result?.success &&
          Array.isArray(result.data) &&
          result.data.length > 0
        ) {
          console.log("RailEats HeroSlider: loaded from Admin CMS", result.data);
          setSlides(result.data);
        } else {
          console.warn("RailEats HeroSlider: Admin CMS empty, using fallback", result);
          setSlides(fallbackSlides);
        }
      } catch (error) {
        if (!ignore) {
          console.error("RailEats HeroSlider: Admin CMS fetch failed, using fallback", error);
          setSlides(fallbackSlides);
        }
      } finally {
        if (!ignore) setHasLoaded(true);
      }
    }

    loadSlidesFromAdminCms();

    return () => {
      ignore = true;
    };
  }, []);

  const normalizedSlides = useMemo(() => {
    const sourceSlides = slides.length > 0 ? slides : fallbackSlides;
    const validSlides = sourceSlides
      .filter((slide) => slide.image_url)
      .sort((a, b) => Number(a.sort_order ?? 999) -
