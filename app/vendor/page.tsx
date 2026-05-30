import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = "https://www.raileats.in";

export const metadata: Metadata = {
  title: "Restaurant Partner & Vendor Registration",
  description:
    "Join RailEats as a restaurant vendor partner for food delivery in train. Expand your railway station restaurant business across India with RailEats.",
  alternates: {
    canonical: "/vendor",
  },
  keywords: [
    "RailEats vendor",
    "restaurant partner",
    "train food vendor",
    "railway food delivery partner",
    "restaurant registration",
    "food delivery business",
    "station restaurant partner",
    "vendor registration",
    "RailEats partner",
  ],
  openGraph: {
    title: "Join RailEats Vendor Partner Program",
    description:
      "Partner with RailEats and grow your restaurant business through food delivery in train across railway stations in India.",
    url: `${siteUrl}/vendor`,
    images: [
      {
        url: "/raileats-logo.png",
        width: 512,
        height: 512,
        alt: "RailEats Vendor Partner",
      },
    ],
  },
};

const vendorSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "RailEats Vendor Partner",
  url: `${siteUrl}/vendor`,
  description:
    "RailEats restaurant vendor partner program for food delivery in train across India.",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How can I join RailEats as a restaurant partner?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can join RailEats by contacting our vendor support team and registering your restaurant for train food delivery services.",
      },
    },
    {
      "@type": "Question",
      name: "Can railway station restaurants partner with RailEats?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, railway station restaurants across India can partner with RailEats to serve train passengers.",
      },
    },
    {
      "@type": "Question",
      name: "What are the benefits of becoming a RailEats vendor?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "RailEats vendors get access to train passengers, online food delivery orders and increased restaurant visibility.",
      },
    },
  ],
};

export default function VendorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(vendorSchema) }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* HERO */}
        <section className="rounded-3xl bg-gradient-to-br from-yellow-100 via-orange-50 to-white p-6 shadow-sm md:p-10">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-orange-600">
            RailEats Vendor Program
          </p>

          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 md:text-6xl">
            Join RailEats as a Restaurant Partner
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700 md:text-lg">
            Grow your restaurant business with RailEats food delivery in train
            platform. Serve train passengers at railway stations across India
            and increase your restaurant orders through online train food
            delivery.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://wa.me/911111111111"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-sm"
            >
              Become a Partner
            </a>

            <Link
              href="/contact"
              className="rounded-xl border border-orange-300 px-6 py-3 text-sm font-bold text-orange-700"
            >
              Contact Team
            </Link>
          </div>
        </section>

        {/* BENEFITS */}
        <section className="mt-10">
          <h2 className="text-3xl font-extrabold text-slate-900">
            Why Partner with RailEats?
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">
                More Food Orders
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                Receive train food delivery orders from thousands of railway
                passengers every day.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">
                Pan India Reach
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                Expand your restaurant visibility across railway stations and
                train routes in India.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">
                Fast Growth
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                Increase restaurant revenue with online train meal delivery and
                repeat customers.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-3xl font-extrabold text-slate-900">
            How RailEats Vendor Partnership Works
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-2xl font-extrabold text-orange-500">1</div>
              <h3 className="mt-2 font-bold text-slate-900">
                Register Restaurant
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Submit your restaurant details and station location.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-2xl font-extrabold text-orange-500">2</div>
              <h3 className="mt-2 font-bold text-slate-900">
                Menu Verification
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Add food items, pricing and delivery timing.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-2xl font-extrabold text-orange-500">3</div>
              <h3 className="mt-2 font-bold text-slate-900">
                Start Receiving Orders
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Accept online food orders from train passengers.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-2xl font-extrabold text-orange-500">4</div>
              <h3 className="mt-2 font-bold text-slate-900">
                Deliver at Station
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Deliver fresh meals directly to passengers at stations.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-10 rounded-3xl bg-slate-900 p-8 text-white">
          <h2 className="text-3xl font-extrabold">
            Start Your Railway Food Delivery Business
          </h2>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
            RailEats helps restaurants connect with train passengers across
            India. Join our vendor network and grow your railway food delivery
            business with trusted train meal orders.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://wa.me/911111111111"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900"
            >
              Join Now
            </a>

            <Link
              href="/contact"
              className="rounded-xl border border-white/20 px-6 py-3 text-sm font-bold text-white"
            >
              Contact Support
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
