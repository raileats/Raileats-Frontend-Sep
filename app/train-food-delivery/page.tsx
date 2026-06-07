import type { Metadata } from "next";
import SeoFoodLandingPage from "../components/SeoFoodLandingPage";

const pageUrl = "https://www.raileats.in/train-food-delivery";

export const metadata: Metadata = {
  title: "Train Food Delivery Online | RailEats",
  description:
    "Train food delivery online by RailEats. Order meals by train number or PNR and get food delivered at your seat.",
  alternates: { canonical: pageUrl },
  keywords: [
    "train food delivery",
    "train meal delivery",
    "online train food delivery",
    "food on train",
  ],
};

export default function Page() {
  return (
    <SeoFoodLandingPage
      pageUrl={pageUrl}
      eyebrow="Train Food Delivery"
      title="Train Food Delivery Online"
      primaryKeyword="train food delivery"
      description="Use RailEats for train food delivery online. Search your train, choose food from available restaurants and place your order."
    />
  );
}
