import type { Metadata } from "next";
import SeoFoodLandingPage from "../components/SeoFoodLandingPage";

const pageUrl = "https://www.raileats.in/food-delivery-in-train";

export const metadata: Metadata = {
  title: "Food Delivery in Train Online | Order by PNR or Train | RailEats",
  description:
    "Order food delivery in train online with RailEats. Search by PNR or train, find available restaurants on your route and get fresh meals delivered to your coach and seat.",
  alternates: { canonical: pageUrl },
  keywords: [
    "food delivery in train",
    "food delivery at train seat",
    "food delivery in train online",
    "order food in train by PNR",
    "coach food delivery",
  ],
};

export default function Page() {
  return (
    <SeoFoodLandingPage
      pageUrl={pageUrl}
      eyebrow="Food Delivery in Train"
      title="Food Delivery in Train"
      description="RailEats makes food delivery in train simple. Search by PNR or train, find available restaurants on your route and order fresh food for delivery to your coach and seat."
    />
  );
}
