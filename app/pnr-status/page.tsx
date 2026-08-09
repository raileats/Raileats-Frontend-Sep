import type { Metadata } from "next";
import PnrStatusClient from "./PnrStatusClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "PNR Status Check Online by 10 Digit PNR | RailEats",
  description:
    "Check PNR status online using your 10 digit PNR. View train, journey date, booking status, chart, coach and seat information on RailEats.",
  alternates: {
    canonical: "https://www.raileats.in/pnr-status",
  },
  openGraph: {
    title: "PNR Status Check Online by 10 Digit PNR | RailEats",
    description:
      "Check 10 digit railway PNR status online and view train, coach, seat and chart details.",
    url: "https://www.raileats.in/pnr-status",
    siteName: "RailEats",
    type: "website",
  },
};

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "PNR Status Check Online",
    url: "https://www.raileats.in/pnr-status",
    description:
      "Check Indian Railway PNR status online with train number, journey date, coach, seat and chart status.",
    publisher: {
      "@type": "Organization",
      name: "RailEats",
      url: "https://www.raileats.in",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PnrStatusClient />
    </>
  );
}
