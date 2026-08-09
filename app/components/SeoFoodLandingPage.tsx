import Link from "next/link";

type SeoFoodLandingPageProps = {
  title: string;
  eyebrow: string;
  description: string;
  pageUrl: string;
};

type LandingContent = {
  overviewTitle: string;
  overview: string[];
  highlights: Array<{ title: string; text: string }>;
  stepsTitle: string;
  steps: string[];
  faqItems: Array<{ question: string; answer: string }>;
  relatedLinks: Array<{ label: string; href: string; text: string }>;
};

const baseUrl = "https://www.raileats.in";

const landingContent: Record<string, LandingContent> = {
  [`${baseUrl}/order-food-in-train`]: {
    overviewTitle: "Order meals online for your train journey",
    overview: [
      "Use your PNR, train number or delivery station to find restaurants serving your route. RailEats shows the available menu, delivery station, minimum order and timing before checkout.",
      "After choosing your meal, verify your mobile number and confirm the passenger, coach and seat details so the restaurant can prepare the order for the selected stop.",
    ],
    highlights: [
      { title: "Search Your Journey", text: "Find service using PNR, train number or railway station." },
      { title: "Compare Menus", text: "Check available items, prices, timing and minimum order." },
      { title: "Confirm Seat Details", text: "Provide the correct coach and seat before placing the order." },
    ],
    stepsTitle: "How to order food in train online",
    steps: ["Search with PNR, train number or station.", "Select a delivery station and available restaurant.", "Add food to cart and verify your mobile number.", "Confirm passenger, coach, seat and payment details.", "Place the order and follow its status in My Orders."],
    faqItems: [
      { question: "Can I order food in train using a PNR?", answer: "Yes. Enter a valid PNR to view journey details and the restaurants available at supported stations on that route." },
      { question: "Can I order using only a train number?", answer: "Yes. Select the journey date and boarding station after entering the train number, then choose an available delivery station." },
      { question: "Where will the meal be delivered?", answer: "The order is prepared for delivery at the coach and seat you confirm for the selected railway station." },
      { question: "Can I view my order after booking?", answer: "Yes. A logged-in customer can open My Orders from the profile area to review available order details and status." },
    ],
    relatedLinks: [
      { label: "Book Food in Train", href: "/book-food-in-train", text: "Plan a meal order before the selected delivery station." },
      { label: "Food Delivery in Train", href: "/food-delivery-in-train", text: "Understand train-seat delivery and availability." },
    ],
  },
  [`${baseUrl}/book-food-in-train`]: {
    overviewTitle: "Plan train food booking before your delivery station",
    overview: [
      "Advance food booking helps you choose the delivery station and restaurant before the train reaches the stop. Search your confirmed journey and review the restaurant's order timing shown by RailEats.",
      "Menus and service depend on the selected train, date and station. Complete the booking only after checking the delivery schedule, coach, seat and contact number.",
    ],
    highlights: [
      { title: "Plan Ahead", text: "Choose a station with enough time before restaurant ordering closes." },
      { title: "Review the Menu", text: "Select available meals that match your journey and order value." },
      { title: "Keep Details Ready", text: "Use an active mobile number and correct passenger seat details." },
    ],
    stepsTitle: "How to book food for a train journey",
    steps: ["Enter the PNR or train number for the journey.", "Review supported delivery stations on the route.", "Choose a restaurant and available food items.", "Verify the mobile number and passenger details.", "Confirm the order before the displayed cut-off time."],
    faqItems: [
      { question: "How early should I book food in train?", answer: "Use the restaurant timing displayed for your selected station. Availability and cut-off time can vary by route and restaurant." },
      { question: "Can I book without a PNR?", answer: "You can search using a train number, then select the journey date and boarding station to view available service." },
      { question: "Are all stations available for food booking?", answer: "No. RailEats displays only the stations and restaurants currently available for the selected journey." },
      { question: "Can restaurant menus change?", answer: "Yes. Menu items, prices and availability can change, so rely on the choices shown during your current booking flow." },
    ],
    relatedLinks: [
      { label: "Order Food in Train", href: "/order-food-in-train", text: "Start a train food order by PNR, train or station." },
      { label: "Train Food Delivery Guide", href: "/train-food-delivery", text: "See how station selection and delivery work." },
    ],
  },
  [`${baseUrl}/food-delivery-in-train`]: {
    overviewTitle: "Food delivery at your train coach and seat",
    overview: [
      "RailEats connects your journey search with restaurants available at supported stations. Select where you want delivery, choose food from the current menu and confirm your coach and seat.",
      "Train timing and restaurant availability can change. Keep your mobile reachable and check the order and journey details shown before confirmation.",
    ],
    highlights: [
      { title: "Route-Based Choice", text: "See restaurants available for the selected train and station." },
      { title: "Seat Information", text: "Confirm coach and seat details for the delivery handover." },
      { title: "Journey Updates", text: "Use live train status when you need current running information." },
    ],
    stepsTitle: "How train-seat food delivery works",
    steps: ["Search the journey and select a supported station.", "Choose an available restaurant and menu items.", "Add the correct coach, seat and passenger contact.", "Review charges and place the order.", "Keep the registered mobile accessible near the delivery station."],
    faqItems: [
      { question: "Does food get delivered to the train seat?", answer: "The order uses the coach and seat details confirmed for delivery at the selected supported station." },
      { question: "What if the train is delayed?", answer: "Train movement can change. Check live train status and keep your registered mobile reachable for order-related coordination." },
      { question: "What meals are available?", answer: "The current restaurant menu may include thali, biryani, breakfast, snacks and other meals depending on station and timing." },
      { question: "Is delivery available on every train?", answer: "Availability depends on the selected route, station, date and active restaurants displayed during search." },
    ],
    relatedLinks: [
      { label: "Restaurant Food in Train", href: "/food-delivery-in-train-from-restaurants", text: "Learn how restaurant and menu selection works." },
      { label: "Live Train Status", href: "/live-train-status", text: "Check running, route and delay information." },
    ],
  },
  [`${baseUrl}/train-food-delivery`]: {
    overviewTitle: "Understand the train food delivery process",
    overview: [
      "Train food delivery depends on matching your journey with a supported station and an available restaurant. RailEats uses the selected train, date and boarding details to show suitable ordering options.",
      "The delivery station, restaurant timing and passenger details matter. Review each of them before payment or order confirmation to avoid selecting the wrong journey stop.",
    ],
    highlights: [
      { title: "Journey Match", text: "Train date and boarding details determine the route shown." },
      { title: "Station Timing", text: "Restaurant service is displayed for an available delivery stop." },
      { title: "Order Handover", text: "Coach, seat and mobile details support delivery coordination." },
    ],
    stepsTitle: "Train food delivery from search to handover",
    steps: ["Find the correct train journey.", "Select a supported delivery station.", "Review restaurant timing and menu availability.", "Confirm passenger, coach, seat and payment details.", "Track the placed order and stay reachable near the station."],
    faqItems: [
      { question: "How does RailEats find restaurants on my route?", answer: "Your journey selection is used to display active restaurants at supported stations along the selected route." },
      { question: "Why does restaurant availability differ by train?", answer: "Availability can vary with route, station, delivery date, restaurant status and ordering time." },
      { question: "Do I need the boarding station?", answer: "When searching by train number, the journey date and boarding station help identify the correct train run." },
      { question: "Where can I check an existing order?", answer: "Logged-in customers can use My Orders in the profile area to view available order information." },
    ],
    relatedLinks: [
      { label: "Browse Delivery Stations", href: "/stations", text: "Explore station pages available on RailEats." },
      { label: "Book Food in Train", href: "/book-food-in-train", text: "Plan a meal before the ordering cut-off." },
    ],
  },
  [`${baseUrl}/best-food-delivery-in-train`]: {
    overviewTitle: "How to choose a suitable train meal",
    overview: [
      "The best choice is the one that fits your route, delivery time, dietary preference and order value. Compare the restaurants and menus RailEats currently shows for your selected station.",
      "Check item descriptions, veg or non-veg labels, restaurant timing and minimum order. Select food that is practical for your journey instead of relying on a single generic recommendation.",
    ],
    highlights: [
      { title: "Diet Preference", text: "Use available menu labels to choose suitable meal options." },
      { title: "Timing Fit", text: "Pick a restaurant serving around the station arrival time." },
      { title: "Clear Order Value", text: "Review item prices, quantities and charges before checkout." },
    ],
    stepsTitle: "Tips for choosing food in train",
    steps: ["Select the correct journey and delivery station.", "Compare currently available restaurants.", "Review menu descriptions, prices and dietary labels.", "Check timing, minimum order and final cart value.", "Confirm an order that suits the passenger and journey."],
    faqItems: [
      { question: "What makes a train food option suitable?", answer: "Consider delivery timing, menu availability, dietary preference, minimum order and your journey duration." },
      { question: "Can I filter vegetarian food?", answer: "Available restaurant pages may show veg labels or filters. Always review the item details before adding food to cart." },
      { question: "Are menu prices fixed across stations?", answer: "Menus and prices are shown for the selected restaurant and may differ by station or change over time." },
      { question: "Does RailEats guarantee every listed dish?", answer: "Availability is based on the current restaurant menu shown during ordering and may change before confirmation." },
    ],
    relatedLinks: [
      { label: "Restaurant Food Delivery", href: "/food-delivery-in-train-from-restaurants", text: "Review how to select a restaurant and menu." },
      { label: "Popular Restaurants", href: "/popular-restaurants-train-journey", text: "Browse restaurant discovery information." },
    ],
  },
  [`${baseUrl}/food-delivery-in-train-from-restaurants`]: {
    overviewTitle: "Choose restaurant food for your train route",
    overview: [
      "Restaurant food availability is tied to the delivery station and selected journey. RailEats displays active options with the menu, price, timing and minimum order information available for that search.",
      "Choose the restaurant only after confirming its station and expected delivery timing. Item selection and checkout use the live options shown during the current ordering session.",
    ],
    highlights: [
      { title: "Station Restaurant", text: "Confirm that the restaurant serves your chosen delivery station." },
      { title: "Current Menu", text: "Order from the items and quantities available in the live menu." },
      { title: "Order Conditions", text: "Check restaurant timing and minimum order before checkout." },
    ],
    stepsTitle: "How to select a restaurant for train delivery",
    steps: ["Search the passenger's correct journey.", "Choose a supported station on the route.", "Compare available restaurant menus and timing.", "Add suitable items and review the cart.", "Verify mobile and seat details, then place the order."],
    faqItems: [
      { question: "How are restaurants shown for a train journey?", answer: "RailEats shows active restaurant options available at supported stations for the selected journey." },
      { question: "Can I choose any restaurant near a station?", answer: "Only the restaurants currently available in the RailEats ordering flow can be selected for that delivery station." },
      { question: "Where can I see the minimum order?", answer: "When provided, minimum-order information appears with the restaurant details before you open or confirm the menu." },
      { question: "Can restaurant timing affect my order?", answer: "Yes. The restaurant must be available for the selected station and delivery time, so review the displayed timing carefully." },
    ],
    relatedLinks: [
      { label: "Food Delivery in Train", href: "/food-delivery-in-train", text: "Read about coach and seat delivery." },
      { label: "Browse Stations", href: "/stations", text: "Explore station-specific food delivery pages." },
    ],
  },
};

const journeyLinks = [
  { label: "Start a food order", href: "/" },
  { label: "Browse delivery stations", href: "/stations" },
  { label: "View popular restaurants", href: "/popular-restaurants-train-journey" },
  { label: "Read ordering FAQs", href: "/faq" },
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
}: SeoFoodLandingPageProps) {
  const content = landingContent[pageUrl];
  const { overviewTitle, overview, highlights, stepsTitle, steps, faqItems, relatedLinks } = content;
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
            {overviewTitle}
          </h2>
          {overview.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-sm font-semibold leading-7 text-slate-600">
              {paragraph}
            </p>
          ))}
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {highlights.map((item) => (
            <div key={item.title} className="app-card-compact p-4">
              <h3 className="font-black text-slate-950">{item.title}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-600">{item.text}</p>
            </div>
          ))}
        </section>

        <section className="app-card p-5 sm:p-6">
          <h2 className="text-2xl font-black text-slate-950">
            Plan your train journey
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {journeyLinks.map((item) => (
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
          <h2 className="text-2xl font-black text-slate-950">Related train food guides</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {relatedLinks.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-orange-300 hover:bg-orange-50">
                <div className="font-black text-slate-900">{item.label}</div>
                <p className="mt-1 text-sm font-semibold text-slate-600">{item.text}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="app-card p-5 sm:p-6">
          <h2 className="text-2xl font-black text-slate-950">
            {stepsTitle}
          </h2>

          <ol className="mt-4 space-y-3 text-sm font-semibold leading-7 text-slate-600">
            {steps.map((step, index) => (
              <li key={step}>{index + 1}. {step}</li>
            ))}
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
