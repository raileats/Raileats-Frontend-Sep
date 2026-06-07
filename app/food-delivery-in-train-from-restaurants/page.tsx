import type { Metadata } from "next";
import SeoFoodLandingPage from "../components/SeoFoodLandingPage";

const pageUrl = "https://www.raileats.in/food-delivery-in-train-from-restaurants";

export const metadata: Metadata = {
  title: "Food Delivery in Train from Restaurants | RailEats",
  description:
    "Order food delivery in train from restaurants with RailEats. Search your route and get fresh restaurant food delivered to your seat.",
  alternates: { canonical: pageUrl },
  keywords: [
    "food delivery in train from restaurants",
    "restaurant food in train",
    "order restaurant food in train",
    "train restaurant food delivery",
  ],
};

export default function Page() {
  return (
    <SeoFoodLandingPage
      pageUrl={pageUrl}
      eyebrow="Restaurant Food in Train"
      title="Food Delivery in Train from Restaurants"
      primaryKeyword="food delivery in train from restaurants"
      description="Order restaurant food in train with RailEats. Choose meals from available restaurant partners and get delivery at your coach and seat."
    />
  );
}
