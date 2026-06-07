import type { Metadata } from "next";
import SeoFoodLandingPage from "../components/SeoFoodLandingPage";

const pageUrl = "https://www.raileats.in/food-delivery-in-train";

export const metadata: Metadata = {
  title: "Food Delivery in Train | Order Meals Online | RailEats",
  description:
    "Get food delivery in train with RailEats. Search train route, choose restaurants and order fresh meals for delivery at your coach and seat.",
  alternates: { canonical: pageUrl },
  keywords: [
    "food delivery in train",
    "train food delivery",
    "online food delivery in train",
    "railway food delivery",
  ],
};

export default function Page() {
  return (
    <SeoFoodLandingPage
      pageUrl={pageUrl}
      eyebrow="Food Delivery in Train"
      title="Food Delivery in Train"
      primaryKeyword="food delivery in train"
      description="RailEats makes food delivery in train simple. Find available restaurants on your route and order fresh food for your journey."
    />
  );
}
