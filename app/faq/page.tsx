import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = "https://www.raileats.in";

export const metadata: Metadata = {
  title: "Train Food Delivery FAQs | Ordering, Payment & Support | RailEats",
  description:
    "Get answers about ordering food in train with RailEats, delivery stations, payment options, cancellations, refunds and customer support.",
  alternates: { canonical: `${siteUrl}/faq` },
  openGraph: {
    title: "Train Food Delivery FAQs | RailEats",
    description:
      "Answers about train food ordering, delivery, payment, cancellation and support on RailEats.",
    url: `${siteUrl}/faq`,
    type: "website",
  },
};

const faqItems = [
  {
    question: "What is RailEats?",
    answer:
      "RailEats is an online train food ordering platform. Passengers can search by PNR, train number or station and order from restaurants shown as available for their journey.",
  },
  {
    question: "How do I order food for my train journey?",
    answer:
      "Enter your PNR, train number or station, select the journey and delivery station, choose an available restaurant and menu items, then complete the checkout details.",
  },
  {
    question: "Can I order food without a PNR?",
    answer:
      "You can search using a train number or station where that option is available. Entering the correct PNR, coach and seat details can help with delivery coordination.",
  },
  {
    question: "At which stations is delivery available?",
    answer:
      "Coverage depends on the train route and restaurants active at each station. Use the order search or browse the stations page to see current availability.",
  },
  {
    question: "Which meals can I order?",
    answer:
      "Menus vary by restaurant and station. Available options may include thali, biryani, snacks, breakfast, beverages and vegetarian or non-vegetarian meals.",
  },
  {
    question: "Which payment options are available?",
    answer:
      "The checkout page shows the payment options available for that order. Options can vary by restaurant, station and order value.",
  },
  {
    question: "When should I place my order?",
    answer:
      "Place the order before the restaurant cut-off shown in the ordering flow. Availability also depends on train timing, station halt and the selected restaurant.",
  },
  {
    question: "Can I cancel or modify an order?",
    answer:
      "Cancellation or modification depends on the current order status and restaurant preparation. Review the Cancellation and Refund Policy and contact support as soon as possible.",
  },
  {
    question: "What happens if my train is delayed or skips the station?",
    answer:
      "Delivery may be affected by train delays, route changes or an insufficient station halt. Contact support with your order ID if the journey changes after ordering.",
  },
  {
    question: "How can I contact RailEats support?",
    answer:
      "Use the RailEats contact page and include your order ID and registered mobile number so the support team can check the order.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
    { "@type": "ListItem", position: 2, name: "FAQs", item: `${siteUrl}/faq` },
  ],
};

export default function FAQPage() {
  return (
    <main className="customer-app-main">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="site-container max-w-4xl space-y-5 pb-24">
        <section className="app-card p-5 sm:p-7">
          <p className="text-sm font-black uppercase tracking-wide text-orange-600">
            RailEats Help Centre
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
            Train food delivery FAQs
          </h1>
          <p className="mt-3 max-w-3xl font-semibold leading-7 text-slate-600">
            Find practical answers about ordering, station availability,
            payments, journey changes, cancellations and support.
          </p>
        </section>

        <section className="app-card divide-y divide-slate-200 p-5 sm:p-7">
          {faqItems.map((item) => (
            <article key={item.question} className="py-5 first:pt-0 last:pb-0">
              <h2 className="text-lg font-black text-slate-950">
                {item.question}
              </h2>
              <p className="mt-2 font-semibold leading-7 text-slate-600">
                {item.answer}
              </p>
            </article>
          ))}
        </section>

        <nav aria-label="RailEats help links" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Link href="/" className="app-btn-primary text-center">Start an order</Link>
          <Link href="/stations" className="app-card-compact p-4 text-center font-black">Browse stations</Link>
          <Link href="/popular-restaurants-train-journey" className="app-card-compact p-4 text-center font-black">Popular restaurants</Link>
          <Link href="/offers" className="app-card-compact p-4 text-center font-black">Train food offers</Link>
          <Link href="/contact" className="app-card-compact p-4 text-center font-black">Contact support</Link>
          <Link href="/cancellation-refund" className="app-card-compact p-4 text-center font-black">Cancellation policy</Link>
        </nav>
      </div>
    </main>
  );
}
