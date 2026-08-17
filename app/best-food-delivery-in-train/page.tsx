import type { Metadata } from "next";
import SeoFoodLandingPage from "../components/SeoFoodLandingPage";

const pageUrl = "https://www.raileats.in/best-food-delivery-in-train";

export const metadata: Metadata = {
  title: "How to Choose the Best Food in Train | RailEats",
  description:
    "Looking for the best food delivery in train? RailEats helps you order fresh meals from available restaurants on your train route.",
  alternates: { canonical: pageUrl },
  keywords: [
    "best food delivery in train",
    "best food in train",
    "choose food in train",
    "compare train meals",
  ],
};

export default function Page() {
  return (
    <SeoFoodLandingPage
      pageUrl={pageUrl}
      eyebrow="Best Food in Train"
      title="Best Food Delivery in Train"
      description="RailEats helps passengers find fresh and convenient food delivery options in train from available restaurants on their route."
    />
  );
}
