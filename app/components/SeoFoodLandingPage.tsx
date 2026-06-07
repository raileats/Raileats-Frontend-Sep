import Link from "next/link";

type SeoFoodLandingPageProps = {
  title: string;
  eyebrow: string;
  description: string;
  pageUrl: string;
  primaryKeyword: string;
};

const stationLinks = [
  { label: "Food delivery at Bhopal Jn", href: "/stations/bhopal-jn-bpl-food-delivery" },
  { label: "Food delivery at Bina Jn", href: "/stations/bina-jn-bina-food-delivery" },
  { label: "Food delivery at Gwalior Jn", href: "/stations/gwalior-jn-gwl-food-delivery" },
  { label: "Food delivery at V Lakshmibai Jhansi", href: "/stations/v-lakshmibai-vglj-food-delivery" },
];

const seoLinks = [
  { label: "Order food in train", href: "/order-food-in-train" },
  { label: "Book food in train", href: "/book-food-in-train" },
  { label: "Food delivery in train", href: "/food-delivery-in-train" },
  { label: "Train food delivery", href: "/train-food-delivery" },
  { label: "Best food delivery in train", href: "/best-food-delivery-in-train" },
  { label: "Food delivery in train from restaurants", href: "/food-delivery-in-train-from-restaurants" },
];

export default function SeoFoodLandingPage({
  title,
  eyebrow,
  description,
  pageUrl,
  primaryKeyword,
}: SeoFoodLandingPageProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url: pageUrl,
    description,
    publisher: {
      "@type": "Organization",
      name: "RailEats",
      url: "https://www.raileats.in",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.raileats.in/?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How to ${primaryKeyword}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: "Visit RailEats, enter your train number or PNR, select your journey details, choose an available restaurant and place your food order for delivery at your train seat.",
        },
      },
      {
        "@type": "Question",
        name: "Can I order food in train by train number?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can search by train number on RailEats, view available stations and restaurants on your route, then order food for your selected delivery station.",
        },
      },
      {
        "@type": "Question",
        name: "Can I check PNR status before ordering food?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. RailEats provides an online PNR status page where passengers can check journey, coach, seat and chart details before ordering food.",
        },
      },
    ],
  };

  return (
    <main className="customer-app-main">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className="site-container max-w-4xl space-y-5">
        <div className="app-card p-5 sm:p-7">
          <p className="text-sm font-black uppercase tracking-wide text-orange-600">
            {eyebrow}
          </p>

          <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
            {title}
          </h1>

          <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-slate-600">
            {description}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <Link
              href="/"
              className="app-btn-primary inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-center"
            >
              Order Food Now
            </Link>

            <Link
              href="/pnr-status"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-center font-black text-slate-800"
            >
              Check PNR Status
            </Link>
          </div>
        </div>

        <section className="app-card p-5 sm:p-6">
          <h2 className="text-2xl font-black text-slate-950">
            Order food online in train with RailEats
          </h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
            RailEats helps passengers find food delivery options on their train
            route. Search by train number, PNR or station, select a restaurant,
            add meals to cart and place your order for delivery at your seat.
            You can order meals such as thali, biryani, snacks, breakfast,
            lunch and dinner from available restaurant partners.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="app-card-compact p-4">
            <div className="text-2xl">🚆</div>
            <h3 className="mt-2 font-black text-slate-950">Search Train</h3>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Enter train number and choose your delivery station.
            </p>
          </div>

          <div className="app-card-compact p-4">
            <div className="text-2xl">🍱</div>
            <h3 className="mt-2 font-black text-slate-950">Choose Food</h3>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Pick meals from available restaurants on your route.
            </p>
          </div>

          <div className="app-card-compact p-4">
            <div className="text-2xl">📍</div>
            <h3 className="mt-2 font-black text-slate-950">Seat Delivery</h3>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Get fresh food delivered to your coach and seat.
            </p>
          </div>
        </section>

        <section className="app-card p-5 sm:p-6">
          <h2 className="text-2xl font-black text-slate-950">
            Popular train food delivery pages
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {seoLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-black text-slate-800 hover:border-orange-300 hover:bg-orange-50"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="app-card p-5 sm:p-6">
          <h2 className="text-2xl font-black text-slate-950">
            Popular stations for food delivery in train
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {stationLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-800 hover:border-orange-300 hover:bg-orange-50"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="app-card p-5 sm:p-6">
          <h2 className="text-2xl font-black text-slate-950">
            How to order food in train?
          </h2>

          <ol className="mt-4 space-y-3 text-sm font-semibold leading-7 text-slate-600">
            <li>1. Enter your train number, PNR or station on RailEats.</li>
            <li>2. Select your journey date and boarding station.</li>
            <li>3. Choose an available delivery station and restaurant.</li>
            <li>4. Add food items to cart and verify your mobile number.</li>
            <li>5. Enter coach and seat details, then place your order.</li>
          </ol>
        </section>

        <section className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-semibold leading-6 text-yellow-900">
          Disclaimer: Food availability, restaurant timing, train timing and
          delivery options may change. Please verify important travel details
          before placing an order.
        </section>
      </section>
    </main>
  );
}
