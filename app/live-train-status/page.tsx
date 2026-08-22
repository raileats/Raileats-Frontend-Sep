import type { Metadata } from "next";
import Link from "next/link";
import LiveTrainStatusClient from "./LiveTrainStatusClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const pageUrl = "https://www.raileats.in/live-train-status";

export const metadata: Metadata = {
  title:
    "Live Train Running Status Today | Check Train Location & Delay | RailEats",
  description:
    "Check live train running status today by train number. See current train location, delay, next station, expected arrival, departure, platform and route updates on RailEats.",
  keywords: [
    "live train running status",
    "live train status",
    "train running status",
    "check train status",
    "train current location",
    "railway live train status",
    "indian railway live train status",
    "train delay status",
    "train platform status",
    "train arrival departure status",
    "train status today",
    "RailEats live train status",
  ],
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    title: "Live Train Running Status Today | RailEats",
    description:
      "Check live Indian Railway train running status with current location, delay, next station, platform, arrival, departure and route details.",
    url: pageUrl,
    siteName: "RailEats",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Live Train Running Status Today | RailEats",
    description:
      "Check live train running status, current train location, delay, platform and route updates online.",
  },
};

export default function Page() {
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Live Train Running Status Today",
    url: pageUrl,
    description:
      "Check Indian Railway live train running status online with train number, current location, delay, next station, platform, arrival, departure and route information.",
    publisher: {
      "@type": "Organization",
      name: "RailEats",
      url: "https://www.raileats.in",
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How can I check live train running status online?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Enter your train number on the RailEats live train running status page and search to view current station, delay, platform, source, destination and route details.",
        },
      },
      {
        "@type": "Question",
        name: "What details are shown in live train running status?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Live train running status can show train number, train name, current station, delay, expected arrival, expected departure, platform number, source, destination and route updates.",
        },
      },
      {
        "@type": "Question",
        name: "Can live train status change after search?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes. Train running status can change due to delays, rescheduling, route updates or railway operations. Always verify important travel information with official railway sources.",
        },
      },
      {
        "@type": "Question",
        name: "Can I check yesterday or tomorrow train running status?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "RailEats may show train running status for today, yesterday or tomorrow when the railway data provider supports it. If a date is unavailable, try checking today's status.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <LiveTrainStatusClient />

      <section
        aria-labelledby="live-status-food-next-steps"
        className="mx-auto max-w-4xl px-4 pb-10 pt-4"
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2
            id="live-status-food-next-steps"
            className="text-xl font-extrabold text-slate-900"
          >
            Check Train Status Before Ordering Food
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            After checking the train running status, you can plan food delivery
            at supported railway stations on your route. Verify your journey
            details before placing an order.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Link
              href="/"
              className="rounded-xl border border-slate-200 p-4 text-sm font-bold text-slate-900 hover:border-orange-300"
            >
              Order Food in Train
            </Link>
            <Link
              href="/pnr-status"
              className="rounded-xl border border-slate-200 p-4 text-sm font-bold text-slate-900 hover:border-orange-300"
            >
              Check PNR Status
            </Link>
            <Link
              href="/stations"
              className="rounded-xl border border-slate-200 p-4 text-sm font-bold text-slate-900 hover:border-orange-300"
            >
              Browse Delivery Stations
            </Link>
            <Link
              href="/popular-restaurants-train-journey"
              className="rounded-xl border border-slate-200 p-4 text-sm font-bold text-slate-900 hover:border-orange-300"
            >
              Popular Train Restaurants
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
