import type { Metadata } from "next";
import { Suspense } from "react";
import HomePageClient from "./HomePageClient";

const siteUrl = "https://www.raileats.in";

export const metadata: Metadata = {
  title: "Order Food in Train Online",
  description:
    "Order fresh food in train by train number, PNR or station. RailEats delivers meals from trusted restaurants to your train seat.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Order Food in Train Online | RailEats",
    description:
      "Search your train, choose a station restaurant, add meals and get food delivered to your seat.",
    url: siteUrl,
    images: [
      {
        url: "/raileats-logo.png",
        width: 512,
        height: 512,
        alt: "RailEats food delivery in train",
      },
    ],
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "RailEats",
  url: siteUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/trains/{search_term_string}-train-food-delivery-in-train`,
    "query-input": "required name=search_term_string",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How can I order food in train on RailEats?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Enter your train number, select boarding date and station, choose an available restaurant, add food items to cart and place your order.",
      },
    },
    {
      "@type": "Question",
      name: "Does RailEats deliver food to train seats?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, RailEats delivers food to your train seat at supported railway stations based on restaurant availability and train arrival time.",
      },
    },
    {
      "@type": "Question",
      name: "Can I order food by train number?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, you can search by train number and RailEats will show available stations and restaurants on that train route.",
      },
    },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <Suspense fallback={<div className="p-6 text-center">Loading RailEats...</div>}>
        <HomePageClient />
      </Suspense>
    </>
  );
}
