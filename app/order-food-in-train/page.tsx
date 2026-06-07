import type { Metadata } from "next";
import SeoFoodLandingPage from "../components/SeoFoodLandingPage";

const pageUrl = "https://www.raileats.in/order-food-in-train";

export const metadata: Metadata = {
  title: "Order Food in Train Online | Fresh Food Delivery in Train | RailEats",
  description:
    "Order food in train online with RailEats. Search by train number, PNR or station and get fresh meals delivered to your coach and seat.",
  alternates: { canonical: pageUrl },
  keywords: [
    "order food in train",
    "order food online in train",
    "train food order",
    "food delivery in train",
    "railway food delivery",
  ],
};

export default function Page() {
  return (
    <SeoFoodLandingPage
      pageUrl={pageUrl}
      eyebrow="Train Food Delivery"
      title="Order Food in Train Online"
      primaryKeyword="order food in train"
      description="Order food in train online with RailEats. Search your train, choose an available station and restaurant, and get fresh meals delivered to your seat."
    />
  );
}
