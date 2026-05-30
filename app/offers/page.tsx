import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = "https://www.raileats.in";

export const metadata: Metadata = {
  title: "Train Food Offers & Discounts",
  description:
    "Get the latest RailEats offers and discounts on food delivery in train. Order fresh meals online and save on train food orders across railway stations in India.",
  alternates: {
    canonical: "/offers",
  },
  keywords: [
    "train food offers",
    "food delivery in train offers",
    "order food in train discount",
    "railway food delivery coupon",
    "RailEats offers",
    "train meal discount",
    "food on train offers",
  ],
  openGraph: {
    title: "Train Food Offers & Discounts | RailEats",
    description:
      "Save on online food delivery in train with RailEats offers, coupons and meal discounts.",
    url: `${siteUrl}/offers`,
    images: [
      {
        url: "/raileats-logo.png",
        width: 512,
        height: 512,
        alt: "RailEats train food offers",
      },
    ],
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Does RailEats provide offers on food delivery in train?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, RailEats provides offers and discounts on selected train food orders, restaurants and railway stations depending on availability.",
      },
    },
    {
      "@type": "Question",
      name: "How can I use RailEats offers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Search your train or station, select food items, go to checkout and apply an available promo code before placing your order.",
      },
    },
    {
      "@type": "Question",
      name: "Are train food offers available at all stations?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Offers may vary by station, restaurant and order value. Available discounts are shown during checkout.",
      },
    },
  ],
};

export default function OffersPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="rounded-3xl bg-gradient-to-br from-amber-100 via-orange-50 to-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-orange-600">
            RailEats Offers
          </p>

          <h1 className="text-3xl font-extrabold leading-tight text-slate-900 md:text-5xl">
            Train Food Offers & Discounts
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700 md:text-lg">
            Order fresh food in train with RailEats and save more with available
            offers, promo codes and restaurant discounts. Search your train,
            choose a station restaurant and get meals delivered to your seat.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow hover:bg-orange-600"
            >
              Order Food in Train
            </Link>

            <Link
              href="/contact"
              className="rounded-xl border border-orange-300 bg-white px-5 py-3 text-sm font-bold text-orange-700 hover:bg-orange-50"
            >
              Need Help?
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Flat Discounts",
              text: "Get selected discounts on eligible train food orders above minimum order value.",
            },
            {
              title: "Station Offers",
              text: "Offers may be available at popular railway stations based on restaurant availability.",
            },
            {
              title: "Fresh Meal Deals",
              text: "Save on thalis, combos, biryani, snacks, beverages and more from trusted restaurants.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-extrabold text-slate-900">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {item.text}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-extrabold text-slate-900">
            How to get food delivery in train offers?
          </h2>

          <ol className="mt-4 space-y-3 text-slate-700">
            <li>
              <strong>1.</strong> Enter your train number, PNR or station on
              RailEats.
            </li>
            <li>
              <strong>2.</strong> Select your journey date and delivery station.
            </li>
            <li>
              <strong>3.</strong> Choose food items from available restaurants.
            </li>
            <li>
              <strong>4.</strong> Apply a valid promo code at checkout.
            </li>
            <li>
              <strong>5.</strong> Place your order and get food delivered to
              your train seat.
            </li>
          </ol>
        </section>

        <section className="mt-8 rounded-2xl bg-slate-900 p-6 text-white">
          <h2 className="text-2xl font-extrabold">
            Order Food in Train Online with RailEats
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
            RailEats helps passengers order hygienic and affordable food in
            train from station restaurants. Whether you are searching for train
            food offers, railway food delivery discounts or online food order in
            train, RailEats makes your journey easier with fresh meals delivered
            at supported stations.
          </p>

          <Link
            href="/"
            className="mt-5 inline-block rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900"
          >
            Search Train & Order Now
          </Link>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Frequently Asked Questions
          </h2>

          <div className="mt-4 space-y-5">
            <div>
              <h3 className="font-bold text-slate-900">
                Does RailEats provide discounts on train food orders?
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Yes, discounts and promo offers may be available depending on
                restaurant, station and order value.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-slate-900">
                Can I order food in train using an offer code?
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Yes, if a promo code is active, you can apply it during checkout
                before placing your order.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-slate-900">
                Is RailEats available at every railway station?
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                RailEats service depends on restaurant availability at supported
                stations and train timing.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
