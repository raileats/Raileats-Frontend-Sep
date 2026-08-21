import type { Metadata } from "next";
import SeoFoodLandingPage from "../components/SeoFoodLandingPage";

const pageUrl = "https://www.raileats.in/order-food-in-train";

export const metadata: Metadata = {
  title: "Order Food in Train Online Today | By PNR, Train or Station | RailEats",
  description:
    "Order food in train online today with RailEats. Check food delivery by PNR, train number or station and get fresh meals delivered to your coach and seat.",
  alternates: { canonical: pageUrl },
  keywords: [
    "order food in train",
    "order food online in train",
    "train food order",
    "order food by PNR",
  ],
};

export default function Page() {
  return (
    <SeoFoodLandingPage
      pageUrl={pageUrl}
      eyebrow="Train Food Delivery"
      title="Order Food in Train Online"
      description="Order food in train online with RailEats. Search by PNR, train number or station, choose an available restaurant, and get fresh meals delivered to your seat."
    />
  );
}
