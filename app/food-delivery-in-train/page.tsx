import type { Metadata } from "next";
import SeoFoodLandingPage from "../components/SeoFoodLandingPage";

const pageUrl = "https://www.raileats.in/food-delivery-in-train";

export const metadata: Metadata = {
  title: "Food Delivery in Train Online Today | Coach & Seat Delivery | RailEats",
  description:
    "Get food delivery in train online today with RailEats. Find restaurants on your train route and order fresh meals delivered to your coach and seat.",
  alternates: { canonical: pageUrl },
  keywords: [
    "food delivery in train",
    "food delivery at train seat",
    "food delivery in train online",
    "coach food delivery",
  ],
};

export default function Page() {
  return (
    <SeoFoodLandingPage
      pageUrl={pageUrl}
      eyebrow="Food Delivery in Train"
      title="Food Delivery in Train"
      description="RailEats makes food delivery in train simple. Find available restaurants on your route and order fresh food delivered to your coach and seat."
    />
  );
}
