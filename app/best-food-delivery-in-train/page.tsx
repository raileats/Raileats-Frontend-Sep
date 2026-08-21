import type { Metadata } from "next";
import SeoFoodLandingPage from "../components/SeoFoodLandingPage";

const pageUrl = "https://www.raileats.in/best-food-delivery-in-train";

export const metadata: Metadata = {
  title: "Best Food Delivery in Train Online | Compare Options | RailEats",
  description:
    "Find the best food delivery in train online with RailEats. Compare available restaurants on your route and choose fresh meals for delivery at your coach and seat.",
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
      description="Find the best food delivery options in train with RailEats. Check available restaurants on your route, compare your choices and order fresh meals for delivery at your coach and seat."
    />
  );
}
