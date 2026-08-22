import type { Metadata } from "next";
import Link from "next/link";
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

      <section
        aria-labelledby="pnr-food-next-steps"
        className="mx-auto max-w-4xl px-4 pb-10 pt-4"
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2
            id="pnr-food-next-steps"
            className="text-xl font-extrabold text-slate-900"
          >
            Check Your PNR, Then Plan Food for Your Journey
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Once you know your train and journey details, RailEats can help you
            find food delivery options at supported railway stations on your
            route. Use the correct PNR and journey details before placing an
            order.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Link href="/" className="rounded-xl border border-slate-200 p-4 text-sm font-bold text-slate-900 hover:border-orange-300">Order Food in Train</Link>
            <Link href="/stations" className="rounded-xl border border-slate-200 p-4 text-sm font-bold text-slate-900 hover:border-orange-300">Browse Delivery Stations</Link>
            <Link href="/popular-restaurants-train-journey" className="rounded-xl border border-slate-200 p-4 text-sm font-bold text-slate-900 hover:border-orange-300">Popular Train Restaurants</Link>
            <Link href="/live-train-status" className="rounded-xl border border-slate-200 p-4 text-sm font-bold text-slate-900 hover:border-orange-300">Live Train Status</Link>
          </div>
        </div>
      </section>
    </>
  );
}
