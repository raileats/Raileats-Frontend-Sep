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

      <h1 id="homepage-seo-title" className="sr-only">
        Order Food in Train Online with RailEats
      </h1>

      <section
        id="order-food"
        aria-labelledby="homepage-seo-title"
        className="desktop-seo-rich mx-auto mt-6 max-w-6xl px-4 pb-24 text-slate-800"
      >
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="space-y-4 p-5 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-600">
                RailEats travel guide
              </p>
              <h2 className="text-2xl font-black leading-tight text-slate-950">
                Food delivery in train, planned around your journey
              </h2>
              <p className="text-sm leading-7 text-slate-700">
                RailEats helps passengers order food in train by train number,
                PNR or railway station. Search your journey, check available
                station restaurants, compare menus and place an order for
                delivery to your train seat where service is available. The
                website keeps restaurant availability, menu details and checkout
                flow online, so passengers can plan meals around route stations,
                train timing and active delivery partners.
              </p>

              <nav
                aria-label="RailEats homepage SEO links"
                className="grid gap-2 sm:grid-cols-3"
              >
                <Link
                  href="#search-by-train"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 transition hover:border-orange-300 hover:bg-orange-50"
                >
                  Train number search
                </Link>
                <Link
                  href="#search-by-pnr"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 transition hover:border-orange-300 hover:bg-orange-50"
                >
                  PNR food order
                </Link>
                <Link
                  href="#search-by-station"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 transition hover:border-orange-300 hover:bg-orange-50"
                >
                  Station restaurants
                </Link>
              </nav>
            </article>

            <aside className="border-t border-slate-200 bg-slate-950 p-5 text-white sm:p-7 lg:border-l lg:border-t-0">
              <h2 className="text-lg font-black">
                Why passengers use RailEats
              </h2>
              <div className="mt-4 grid gap-3">
                {[
                  "Search by train, PNR or station",
                  "Compare restaurant menus before ordering",
                  "Plan meals around railway station stops",
                  "Checkout flow built for train journeys",
                ].map((item) => (
                  <p
                    key={item}
                    className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm font-medium text-slate-100"
                  >
                    {item}
                  </p>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section
          aria-labelledby="how-it-works"
          className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]"
        >
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 id="how-it-works" className="text-xl font-black text-slate-950">
              How RailEats food ordering works
            </h2>
            <ol className="mt-4 space-y-3">
              {[
                "Search your train, PNR or station",
                "Choose an available delivery station",
                "Select a restaurant and menu items",
                "Confirm passenger and order details",
                "Receive food at the train seat where supported",
              ].map((step, index) => (
                <li
                  key={step}
                  className="flex gap-3 text-sm leading-6 text-slate-700"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-black text-orange-700">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </article>

          <article
            aria-labelledby="homepage-faq"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <h2 id="homepage-faq" className="text-xl font-black text-slate-950">
              RailEats food delivery FAQ
            </h2>
            <div className="mt-4 divide-y divide-slate-200">
              {faqItems.slice(0, 5).map((item) => (
                <details key={item.question} className="group py-3">
                  <summary className="cursor-pointer list-none text-sm font-bold text-slate-950">
                    {item.question}
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </article>
        </section>
      </section>
    </>
  );
}
