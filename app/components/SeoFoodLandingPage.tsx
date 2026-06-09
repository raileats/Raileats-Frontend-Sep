import Link from "next/link";

type SeoFoodLandingPageProps = {
  title: string;
  eyebrow: string;
  description: string;
  pageUrl: string;
  primaryKeyword: string;
};

const baseUrl = "https://www.raileats.in";

const seoLinks = [
  { label: "Order food in train", href: "/order-food-in-train" },
  { label: "Book food in train", href: "/book-food-in-train" },
  { label: "Food delivery in train", href: "/food-delivery-in-train" },
  { label: "Train food delivery", href: "/train-food-delivery" },
  { label: "Best food delivery in train", href: "/best-food-delivery-in-train" },
  {
    label: "Food delivery in train from restaurants",
    href: "/food-delivery-in-train-from-restaurants",
  },
];

const stationLinks = [
  { label: "Food delivery at Bhopal Jn", href: "/stations/bhopal-jn-bpl-food-delivery" },
  { label: "Food delivery at Bina Jn", href: "/stations/bina-jn-bina-food-delivery" },
  { label: "Food delivery at Gwalior Jn", href: "/stations/gwalior-jn-gwl-food-delivery" },
  { label: "Food delivery at V Lakshmibai Jhansi", href: "/stations/v-lakshmibai-vglj-food-delivery" },
];

const supportLinks = [
  {
    label: "Check PNR Status",
    href: "/pnr-status",
    text: "View train, journey, chart, coach and seat details before ordering food.",
  },
  {
    label: "Live Train Running Status",
    href: "/live-train-status",
    text: "Check current train running status, delay, platform and route updates.",
  },
];

export default function SeoFoodLandingPage({
  title,
  eyebrow,
  description,
  pageUrl,
  primaryKeyword,
}: SeoFoodLandingPageProps) {
  const faqItems = [
    {
      question: `How to ${primaryKeyword}?`,
      answer:
        "Visit RailEats, enter your train number or PNR, select your journey details, choose an available restaurant and place your food order for delivery at your train seat.",
    },
    {
      question: "Can I order food in train by train number?",
      answer:
        "Yes. You can search by train number on RailEats, view available stations and restaurants on your route, then order food for your selected delivery station.",
    },
    {
      question: "Can I check PNR status before ordering food?",
      answer:
        "Yes. RailEats provides an online PNR status page where passengers can check journey, coach, seat and chart details before ordering food.",
    },
    {
      question: "Which food items can I order in train?",
      answer:
        "Food availability depends on the restaurant and station. You may find thali, biryani, snacks, breakfast, lunch, dinner and veg or non-veg meal options on available routes.",
    },
  ];

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url: pageUrl,
    description,
    inLanguage: "en-IN",
    isPartOf: {
      "@type": "WebSite",
      name: "RailEats",
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "RailEats",
      url: baseUrl,
    },
    about: [
      "food delivery in train",
      "order food in train",
      "book food in train",
      "train food delivery",
      "railway food delivery",
    ],
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
        item: pageUrl,
      },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <main className="customer-app-main">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
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

          <h1 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-4xl">
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
            RailEats helps passengers search restaurants on their train route
            and place food orders for seat delivery. You can search by train
            number, PNR or station, choose an available delivery station, select
            a restaurant, add meals to cart and complete your order with mobile
            verification.
          </p>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
            This page is built for passengers looking for {primaryKeyword},
            train food delivery, railway food delivery, food delivery in train
            from restaurants and fresh meals during journey.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="app-card-compact p-4">
            <h3 className="font-black text-slate-950">Search Train</h3>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Enter train number or PNR and select journey details.
            </p>
          </div>

          <div className="app-card-compact p-4">
            <h3 className="font-black text-slate-950">Choose Restaurant</h3>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              View available restaurants by station, timing and minimum order.
            </p>
          </div>

          <div className="app-card-compact p-4">
            <h3 className="font-black text-slate-950">Get Seat Delivery</h3>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Place your order and receive food at your coach and seat.
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
            Popular railway tools
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {supportLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-orange-300 hover:bg-orange-50"
              >
                <div className="font-black text-slate-900">{item.label}</div>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {item.text}
                </p>
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
            <li>2. Select journey date and boarding station.</li>
            <li>3. Choose an available delivery station and restaurant.</li>
            <li>4. Add food items to cart and verify your mobile number.</li>
            <li>5. Enter coach and seat details, then place your order.</li>
          </ol>
        </section>

        <section className="app-card p-5 sm:p-6">
          <h2 className="text-2xl font-black text-slate-950">
            Frequently asked questions
          </h2>

          <div className="mt-4 space-y-4">
            {faqItems.map((item) => (
              <div key={item.question}>
                <h3 className="font-black text-slate-900">{item.question}</h3>
                <p className="mt-1 text-sm font-semibold leading-7 text-slate-600">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
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
