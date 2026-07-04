import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import HomePageClient from "./HomePageClient";

const siteUrl = "https://www.raileats.in";
const pageTitle =
  "RailEats - Order Food in Train Online | Fresh Train Food Delivery";
const pageDescription =
  "Order food in train online with RailEats by train number, PNR or station. Get fresh meals from trusted railway restaurants delivered to your seat.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: pageTitle,
  description: pageDescription,
  applicationName: "RailEats",
  category: "Food & Drink",
  keywords: [
    "order food in train",
    "food delivery in train",
    "train food delivery",
    "food on train",
    "online food order in train",
    "railway station food delivery",
    "IRCTC food delivery",
    "PNR food order",
    "train meal delivery",
    "fresh food in train",
    "RailEats",
    "food delivery at railway station",
    "order meal by train number",
    "veg food in train",
    "restaurant food in train",
    "train seat food delivery",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: "RailEats",
    title: pageTitle,
    description: pageDescription,
    url: siteUrl,
    locale: "en_IN",
    images: [
      {
        url: "/raileats-logo.png",
        width: 512,
        height: 512,
        alt: "RailEats food delivery in train",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/raileats-logo.png"],
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  name: "RailEats",
  url: siteUrl,
  publisher: {
    "@id": `${siteUrl}/#organization`,
  },
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/trains/{search_term_string}-train-food-delivery-in-train`,
    "query-input": "required name=search_term_string",
  },
};

const webPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${siteUrl}/#webpage`,
  url: siteUrl,
  name: pageTitle,
  description: pageDescription,
  isPartOf: {
    "@id": `${siteUrl}/#website`,
  },
  about: {
    "@id": `${siteUrl}/#organization`,
  },
  inLanguage: "en-IN",
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${siteUrl}/#train-food-delivery-service`,
  name: "Food Delivery in Train",
  serviceType: "Train food delivery",
  provider: {
    "@id": `${siteUrl}/#organization`,
  },
  areaServed: {
    "@type": "Country",
    name: "India",
  },
  description:
    "RailEats helps passengers order food in train by train number, PNR or station from available railway station restaurants.",
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "@id": `${siteUrl}/#breadcrumb`,
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: siteUrl,
    },
  ],
};

const itemListSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "@id": `${siteUrl}/#popular-actions`,
  name: "RailEats train food ordering options",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Search by train number",
      url: `${siteUrl}/#order-food`,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Search by PNR",
      url: `${siteUrl}/#order-food`,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "Search by railway station",
      url: `${siteUrl}/#order-food`,
    },
  ],
};

const faqItems = [
  {
    question: "How can I order food in train on RailEats?",
    answer:
      "Enter your train number, PNR or station, choose an available restaurant, add food items to your cart and place the order for delivery during your journey.",
  },
  {
    question: "Does RailEats deliver food to train seats?",
    answer:
      "Yes, RailEats supports train seat delivery at available stations. Delivery depends on restaurant availability, train timing and the details entered during checkout.",
  },
  {
    question: "Can I order food by train number?",
    answer:
      "Yes, passengers can search by train number to view route stations where food delivery options may be available through RailEats.",
  },
  {
    question: "Can I order food by PNR on RailEats?",
    answer:
      "Yes, PNR search can help identify journey details and available food delivery choices where supported by the RailEats service flow.",
  },
  {
    question: "What type of food can I order in train?",
    answer:
      "Available choices depend on the station and restaurant menu. Passengers may find meals, snacks, beverages and other freshly prepared items where restaurants are active.",
  },
  {
    question: "Is online payment available?",
    answer:
      "RailEats supports the payment options shown during checkout. Availability can vary by order, restaurant and station.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${siteUrl}/#faq`,
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

const schemas = [
  websiteSchema,
  webPageSchema,
  serviceSchema,
  breadcrumbSchema,
  itemListSchema,
  faqSchema,
];

export default function Page() {
  return (
    <>
      {schemas.map((schema) => (
        <script
          key={schema["@id"] || schema["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <Suspense
        fallback={<div className="p-6 text-center">Loading RailEats...</div>}
      >
        <HomePageClient />
      </Suspense>

      <section
        id="order-food"
        aria-labelledby="homepage-seo-title"
        className="mx-auto mt-8 max-w-5xl space-y-6 px-4 pb-8 text-slate-800"
      >
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            RailEats train food delivery
          </p>
          <h1
            id="homepage-seo-title"
            className="text-2xl font-bold leading-tight text-slate-950 sm:text-3xl"
          >
            Order Food in Train Online with RailEats
          </h1>
          <p className="text-sm leading-6 text-slate-700 sm:text-base">
            RailEats helps passengers order fresh food in train by train number,
            PNR or railway station. Search your journey, check available station
            restaurants, choose suitable meals and place an order for delivery to
            your train seat where service is available. The ordering flow is
            designed for real train travel, so passengers can plan meals around
            route stations, restaurant availability and train arrival timing.
          </p>
        </header>

        <nav
          aria-label="RailEats homepage links"
          className="grid gap-3 sm:grid-cols-3"
        >
          <Link
            href="#search-by-train"
            className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-900 shadow-sm"
          >
            Search by Train Number
          </Link>
          <Link
            href="#search-by-pnr"
            className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-900 shadow-sm"
          >
            Order Food by PNR
          </Link>
          <Link
            href="#search-by-station"
            className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-900 shadow-sm"
          >
            Find Station Restaurants
          </Link>
        </nav>

        <div className="grid gap-4 md:grid-cols-3">
          <article
            id="search-by-train"
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h2 className="text-lg font-bold text-slate-950">
              Food Delivery by Train Number
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Enter a train number to explore route-based food delivery options.
              RailEats shows available stations and restaurants according to the
              journey flow, helping passengers choose food before the train
              reaches a supported stop.
            </p>
          </article>

          <article
            id="search-by-pnr"
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h2 className="text-lg font-bold text-slate-950">
              Order Food in Train by PNR
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              PNR search can make ordering easier by connecting the food order
              with journey details. Passengers can review available choices,
              select items from restaurant menus and continue through checkout.
            </p>
          </article>

          <article
            id="search-by-station"
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h2 className="text-lg font-bold text-slate-950">
              Railway Station Food Delivery
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Station search helps passengers find food options at supported
              railway stations. Menu availability, restaurant status and delivery
              timing can vary, so RailEats keeps the website as the source of
              truth for current ordering choices.
            </p>
          </article>
        </div>

        <section aria-labelledby="why-raileats" className="space-y-3">
          <h2 id="why-raileats" className="text-xl font-bold text-slate-950">
            Why Choose RailEats for Train Food Delivery?
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Fresh meals from trusted restaurants",
              "Search by train, PNR or station",
              "Delivery to train seat where available",
              "Menus and availability managed online",
              "Simple cart and checkout flow",
              "Useful for planned train journeys",
              "Food options based on active stations",
              "RailEats website stays the source of truth",
            ].map((item) => (
              <p
                key={item}
                className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-800 shadow-sm"
              >
                {item}
              </p>
            ))}
          </div>
        </section>

        <section aria-labelledby="how-it-works" className="space-y-3">
          <h2 id="how-it-works" className="text-xl font-bold text-slate-950">
            How RailEats Food Ordering Works
          </h2>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              "Search your train, PNR or station",
              "Choose an available delivery station",
              "Select a restaurant and menu items",
              "Confirm passenger and order details",
              "Receive food at the train seat where supported",
            ].map((step, index) => (
              <li
                key={step}
                className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700 shadow-sm"
              >
                <span className="mb-2 block text-base font-bold text-amber-600">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="homepage-faq" className="space-y-3">
          <h2 id="homepage-faq" className="text-xl font-bold text-slate-950">
            RailEats Food Delivery FAQ
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {faqItems.map((item) => (
              <article
                key={item.question}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <h3 className="text-base font-bold text-slate-950">
                  {item.question}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </>
  );
}
