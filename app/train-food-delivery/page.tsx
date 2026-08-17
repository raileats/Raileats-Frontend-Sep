import type { Metadata } from "next";
import SeoFoodLandingPage from "../components/SeoFoodLandingPage";

const pageUrl = "https://www.raileats.in/train-food-delivery";

export const metadata: Metadata = {
  title: "How Train Food Delivery Works | RailEats",
  description:
    "Train food delivery online by RailEats. Order meals by train number or PNR and get food delivered at your seat.",
  alternates: { canonical: pageUrl },
  keywords: [
    "train food delivery",
    "train meal delivery",
    "train food delivery process",
    "train meal handover",
  ],
};

export default function Page() {
  return (
    <SeoFoodLandingPage
      pageUrl={pageUrl}
      eyebrow="Train Food Delivery"
      title="Train Food Delivery Online"
      description="Use RailEats for train food delivery online. Search your train, choose food from available restaurants and place your order."
    />
  );
}
