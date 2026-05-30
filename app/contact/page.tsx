import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = "https://www.raileats.in";

export const metadata: Metadata = {
  title: "Contact RailEats Support",
  description:
    "Contact RailEats customer support for food delivery in train, order help, restaurant support and railway station food delivery assistance across India.",
  alternates: {
    canonical: "/contact",
  },
  keywords: [
    "RailEats contact",
    "RailEats customer support",
    "food delivery in train support",
    "train food order help",
    "railway food delivery contact",
    "order food in train customer care",
  ],
  openGraph: {
    title: "Contact RailEats Support | Food Delivery in Train",
    description:
      "Need help with train food delivery? Contact RailEats support for order assistance, restaurant support and customer care.",
    url: `${siteUrl}/contact`,
    images: [
      {
        url: "/raileats-logo.png",
        width: 512,
        height: 512,
        alt: "RailEats customer support",
      },
    ],
  },
};

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact RailEats",
  url: `${siteUrl}/contact`,
  mainEntity: {
    "@type": "Organization",
    name: "RailEats",
    url: siteUrl,
    email: "railrats@gmail.com",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+91-1111111111",
      contactType: "customer support",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How can I contact RailEats customer support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can contact RailEats support by email, phone or WhatsApp for train food order assistance.",
      },
    },
    {
      "@type": "Question",
      name: "Can RailEats help with food delivery in train orders?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, RailEats support can help with food delivery in train orders, station availability, restaurant issues and order status.",
      },
    },
    {
      "@type": "Question",
      name: "What are RailEats support hours?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "RailEats support is available from 9:00 AM to 9:00 PM on all days.",
      },
    },
  ],
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="rounded-3xl bg-gradient-to-br from-yellow-100 via-orange-50 to-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-orange-600">
            RailEats Support
          </p>

          <h1 className="text-3xl font-extrabold leading-tight text-slate-900 md:text-5xl">
            Contact RailEats Customer Support
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700 md:text-lg">
            Need help with food delivery in train, order status, restaurant
            availability or railway station delivery support? Contact RailEats
            customer care for quick assistance across India.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Email Support</p>
            <a
              href="mailto:railrats@gmail.com"
              className="mt-2 block text-xl font-extrabold text-orange-700"
            >
              railrats@gmail.com
            </a>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Email us for train food order help, feedback, refund queries or
              restaurant support.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Call Center</p>
            <a
              href="tel:1111111111"
              className="mt-2 block text-xl font-extrabold text-orange-700"
            >
              1111111111
            </a>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Call RailEats support for food delivery in train assistance and
              order-related help.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">WhatsApp</p>
            <a
              href="https://wa.me/911111111111"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white"
            >
              Chat on WhatsApp
            </a>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Connect with us on WhatsApp for quick support during your train
              journey.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Support Hours</p>
            <p className="mt-2 text-xl font-extrabold text-slate-900">
              9:00 AM – 9:00 PM
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              RailEats customer support is available all days for online food
              delivery in train queries.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-extrabold text-slate-900">
            How RailEats Support Can Help
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-bold text-slate-900">Order Help</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Get support for train food order placement, checkout and order
                confirmation.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-bold text-slate-900">Station Availability</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Know whether food delivery is available at your selected railway
                station.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-bold text-slate-900">Restaurant Support</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Contact us for restaurant partner help, menu updates and service
                related support.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl bg-slate-900 p-6 text-white">
          <h2 className="text-2xl font-extrabold">
            Order Food in Train with RailEats
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
            RailEats helps passengers order fresh and hygienic food in train from
            trusted station restaurants. Search by train, PNR or railway station
            and get your food delivered to your seat.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900"
            >
              Order Food Now
            </Link>

            <Link
              href="/faq"
              className="rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white"
            >
              View FAQ
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
