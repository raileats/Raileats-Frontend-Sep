import type { Metadata } from "next";
import LiveTrainStatusClient from "./LiveTrainStatusClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const pageUrl = "https://www.raileats.in/live-train-status";

export const metadata: Metadata = {
  title:
    "Live Train Running Status Online | Indian Railway Live Train Status | RailEats",
  description:
    "Check live train running status online with train number. View current station, delay, platform, source, destination, journey date, arrival, departure and train running updates on RailEats.",
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
    "NTES train status",
    "train arrival departure status",
    "RailEats live train status",
  ],
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    title: "Live Train Running Status Online | RailEats",
    description:
      "Check Indian Railway live train running status with current station, delay, platform, arrival, departure and route details.",
    url: pageUrl,
    siteName: "RailEats",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Live Train Running Status Online | RailEats",
    description:
      "Check live train running status, delay, platform and current train location online.",
  },
};

export default function Page() {
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Live Train Running Status Online",
    url: pageUrl,
    description:
      "Check Indian Railway live train running status online with train number, current station, delay, platform, arrival, departure and route information.",
    publisher: {
      "@type": "Organization",
      name: "RailEats",
      url: "https://www.raileats.in",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${pageUrl}?train={train_number}`,
      "query-input": "required name=train_number",
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
    </>
  );
}
