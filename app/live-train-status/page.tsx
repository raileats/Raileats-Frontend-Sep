import type { Metadata } from "next";
import LiveTrainStatusClient from "./LiveTrainStatusClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const pageUrl = "https://www.raileats.in/live-train-status";

export const metadata: Metadata = {
  title: "Live Train Status Online | Train Running Status | RailEats",
  description:
    "Check live train running status online with train number. View current station, delay, platform, source, destination, journey date and train running updates on RailEats.",
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    title: "Live Train Status Online | RailEats",
    description:
      "Check train running status, delay, platform and current train location online.",
    url: pageUrl,
    siteName: "RailEats",
    type: "website",
  },
  keywords: [
    "live train status",
    "train running status",
    "check train status",
    "train current location",
    "railway live train status",
    "train delay status",
    "train platform status",
    "Indian railway train running status",
  ],
};

export default function Page() {
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Live Train Status Online",
    url: pageUrl,
    description:
      "Check live train running status with train number, delay, current station, platform and route information.",
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
        name: "How can I check live train status online?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Enter your train number on the RailEats live train status page and search to view current running information, delay, platform, source and destination details.",
        },
      },
      {
        "@type": "Question",
        name: "What details are shown in live train running status?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Live train running status can show train number, train name, current station, delay, expected arrival, expected departure, platform number, source, destination and route updates.",
        },
      },
      {
        "@type": "Question",
        name: "Can live train status change after search?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Train running status can change due to delays, rescheduling, route updates or railway operations. Always verify important travel information with official railway sources.",
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
