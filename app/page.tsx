import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import HomePageClient from "./HomePageClient";

const siteUrl = "https://www.raileats.in";

const pageTitle =
  "Order Food in Train Online | Food Delivery in Train by PNR, Train or Station | RailEats";

const pageDescription =
  "Order food in train online with RailEats by PNR, train number or station. Get fresh meals from active railway restaurants delivered to your seat.";

const faqItems = [
  {
    question: "How can I order food in train on RailEats?",
    answer:
      "You can order food in train on RailEats by searching with PNR, train number or station, choosing an available restaurant, adding food items and placing the order online.",
  },
  {
    question: "Can I order food in train by PNR?",
    answer:
      "Yes, RailEats supports PNR based food ordering where journey details and available restaurant options can be shown based on the supported service flow.",
  },
  {
    question: "Can I search food delivery by train number?",
    answer:
      "Yes, passengers can search by train number to find route stations and active restaurants where food delivery may be available.",
  },
  {
    question: "Does RailEats deliver food to train seats?",
    answer:
      "RailEats helps passengers get food delivered to their train seat at supported railway stations, depending on restaurant availability, train timing and checkout details.",
  },
  {
    question: "What food can I order in train?",
    answer:
      "Food options depend on active restaurant menus. Passengers may find thali, biryani, snacks, breakfast, beverages, meals and other available items.",
  },
  {
    question: "Are restaurant menus live on RailEats?",
    answer:
      "RailEats keeps menus and restaurant availability online so passengers can choose from currently available food options before placing an order.",
  },
  {
    question: "Can I check PNR status on RailEats?",
    answer:
      "Yes, RailEats provides PNR status access so passengers can check journey information before ordering food.",
  },
  {
    question: "Can I check live train running status?",
    answer:
      "Yes, RailEats links passengers to live train running status tools so they can track trains before planning food delivery.",
  },
];

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
    "order food by PNR",
    "PNR food order",
    "order food by train number",
    "railway station food delivery",
    "train seat food delivery",
    "fresh food in train",
    "veg food in train",
    "biryani in train",
    "thali in train",
    "restaurant food in train",
    "IRCTC food delivery",
    "RailEats",
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

const schemas = [
  {
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
  },
  {
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
  },
  {
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
      "RailEats helps passengers order food in train by PNR, train number or station from available railway station restaurants.",
  },
  {
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
  },
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${siteUrl}/#popular-actions`,
    name: "RailEats train food ordering options",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Order food by PNR",
        url: `${siteUrl}/#order-food`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Order food by train number",
        url: `${siteUrl}/#order-food`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Find station restaurants",
        url: `${siteUrl}/#order-food`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: "Check PNR status",
        url: `${siteUrl}/pnr-status`,
      },
      {
        "@type": "ListItem",
        position: 5,
        name: "Check live train running status",
        url: `${siteUrl}/live-train-status`,
      },
    ],
  },
  {
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
  },
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
                RailEats train food delivery
              </p>

              <h2 className="text-2xl font-black leading-tight text-slate-950">
                Order food in train by PNR, train number or railway station
              </h2>

              <p className="text-sm leading-7 text-slate-700">
                RailEats helps passengers plan meals during train journeys with
                a simple food ordering flow. Search by PNR, train number or
                station, view available railway station restaurants, compare
                menu options and place an order for delivery where service is
                available. The website keeps restaurant availability, menus,
                minimum order details and checkout flow online, so passengers
                can make food decisions around train timing, station halt and
                active restaurant partners.
              </p>

              <nav
                aria-label="RailEats homepage quick links"
                className="grid gap-2 sm:grid-cols-3"
              >
                <Link
                  href="/pnr-status"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 transition hover:border-orange-300 hover:bg-orange-50"
                >
                  Check PNR Status
                </Link>

                <Link
                  href="/live-train-status"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 transition hover:border-orange-300 hover:bg-orange-50"
                >
                  Live Train Status
                </Link>

                <Link
                  href="/popular-restaurants-train-journey"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 transition hover:border-orange-300 hover:bg-orange-50"
                >
                  Popular Restaurants
                </Link>
              </nav>
            </article>

            <aside className="border-t border-slate-200 bg-slate-950 p-5 text-white sm:p-7 lg:border-l lg:border-t-0">
              <h2 className="text-lg font-black">
                Why passengers use RailEats
              </h2>

              <div className="mt-4 grid gap-3">
                {[
                  "Search food by PNR, train or station",
                  "View restaurants available for your journey",
                  "Choose meals from active restaurant menus",
                  "Use railway tools before placing an order",
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
                "Search your PNR, train number or station",
                "Choose an available delivery station",
                "Select a restaurant and menu items",
                "Confirm passenger and order details",
                "Receive food where station delivery is supported",
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
              {faqItems.slice(0, 6).map((item) => (
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
