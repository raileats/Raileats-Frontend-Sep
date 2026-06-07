import type { Metadata } from "next";
import SeoFoodLandingPage from "../components/SeoFoodLandingPage";

const pageUrl = "https://www.raileats.in/book-food-in-train";

export const metadata: Metadata = {
  title: "Book Food in Train Online | RailEats",
  description:
    "Book food in train online using train number or PNR. Choose restaurants on your route and get meals delivered to your seat.",
  alternates: { canonical: pageUrl },
  keywords: [
    "book food in train",
    "book train food",
    "online food booking in train",
    "food booking in train",
  ],
};

export default function Page() {
  return (
    <SeoFoodLandingPage
      pageUrl={pageUrl}
      eyebrow="Book Train Food"
      title="Book Food in Train Online"
      primaryKeyword="book food in train"
      description="Book food in train with RailEats by searching your train or PNR. Select meals from available restaurants and get delivery at your seat."
    />
  );
}
