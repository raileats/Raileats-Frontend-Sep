import type { Metadata } from "next";
import SeoFoodLandingPage from "../components/SeoFoodLandingPage";

const pageUrl = "https://www.raileats.in/best-food-delivery-in-train";

export const metadata: Metadata = {
  title: "Best Food Delivery in Train | RailEats",
  description:
    "Looking for the best food delivery in train? RailEats helps you order fresh meals from available restaurants on your train route.",
  alternates: { canonical: pageUrl },
  keywords: [
    "best food delivery in train",
    "best train food delivery",
    "best food in train",
    "order best food in train",
  ],
};

export default function Page() {
  return (
    <SeoFoodLandingPage
      pageUrl={pageUrl}
      eyebrow="Best Food in Train"
      title="Best Food Delivery in Train"
      primaryKeyword="best food delivery in train"
      description="RailEats helps passengers find fresh and convenient food delivery options in train from available restaurants on their route."
    />
  );
}
