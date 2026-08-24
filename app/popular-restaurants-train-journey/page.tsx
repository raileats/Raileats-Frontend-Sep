import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  MapPin,
  Search,
  Star,
  Store,
  Train,
  Utensils,
} from "lucide-react";
import PnrSearchBox from "@/components/PnrSearchBox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = "https://www.raileats.in";
const PAGE_PATH = "/popular-restaurants-train-journey";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

export const metadata: Metadata = {
  title: "Popular Restaurants for Train Food Delivery | RailEats",
  description:
    "Explore popular restaurants for train food delivery across railway stations in India. Enter your PNR and order fresh food online during your train journey with RailEats.",
  keywords: [
    "popular restaurants in train",
    "train food delivery",
    "food delivery in train",
    "order food in train",
    "railway food delivery",
    "online food order in train",
    "restaurant food in train",
    "PNR food delivery",
    "RailEats",
  ],
  alternates: { canonical: PAGE_URL },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    siteName: "RailEats",
    title: "Popular Restaurants for Train Food Delivery | RailEats",
    description:
      "Discover popular railway station restaurants and order fresh food for delivery directly to your train seat.",
    images: [{
      url: `${SITE_URL}/raileats-logo.png`,
      width: 1200,
      height: 630,
      alt: "RailEats train food delivery",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Popular Restaurants for Train Food Delivery | RailEats",
    description:
      "Explore restaurants at railway stations and order food online during your train journey.",
    images: [`${SITE_URL}/raileats-logo.png`],
  },
};

type Restaurant = {
  RestroCode: string | number;
  RestroName: string;
  StationCode: string;
  StationName: string;
  RestroDisplayPhoto?: string | null;
  RaileatsStatus?: number | null;
  RestroRating?: number | null;
  MinimumOrderValue?: number | null;
};

type RestaurantsResponse = {
  success?: boolean;
  count?: number;
  data?: Restaurant[];
  error?: string;
};

const popularStations = [
  { name: "Food Delivery at Lalitpur Junction", href: "/stations/lalitpur-jn-lar-food-delivery-in-train" },
  { name: "Food Delivery at Jabalpur Junction", href: "/stations/jabalpur-jbp-food-delivery-in-train" },
  { name: "Food Delivery at Khandwa Junction", href: "/stations/khandwa-knw-food-delivery-in-train" },
  { name: "Food Delivery at Ratlam Junction", href: "/stations/ratlam-rtm-food-delivery-in-train" },
  { name: "Food Delivery at Ahmedabad Junction", href: "/stations/ahmedabad-jn-adi-food-delivery-in-train" },
  { name: "Food Delivery at Vijayawada Junction", href: "/stations/vijayawada-jn-bza-food-delivery-in-train" },
];

const faqs = [
  { question: "How can I order food from a restaurant in train?", answer: "Enter your valid 10-digit PNR on RailEats. The system checks your train route, journey date, arrival time and available railway stations. You can then select an eligible restaurant, add food to your cart and complete the order." },
  { question: "Can food be delivered directly to my train seat?", answer: "Yes. Enter the correct PNR, coach and seat details while placing the order. The selected restaurant prepares the food and delivers it at your chosen railway station, subject to route and restaurant availability." },
  { question: "Which railway stations have RailEats restaurants?", answer: "RailEats works with restaurants at multiple railway stations across India. The available stations and restaurants depend on your train route, journey date, delivery time and the restaurant's current operating status." },
  { question: "Can I view a restaurant menu before ordering?", answer: "Yes. Select View Menu on any restaurant card to explore available food items, prices and the minimum order value for that outlet." },
  { question: "Why is a restaurant not available for my train?", answer: "Availability may depend on whether the station falls on your train route, restaurant opening hours, delivery cut-off time, journey date and the restaurant's active status." },
  { question: "Do I need a PNR to order food in train?", answer: "A valid PNR is recommended because it helps RailEats identify your train, journey date and eligible delivery stations. Always enter accurate journey details for successful delivery." },
];

function cleanText(value: unknown) { return String(value ?? "").trim(); }
function createSlug(value: unknown) {
  return cleanText(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function createMenuUrl(restaurant: Restaurant) {
  const restroCode = cleanText(restaurant.RestroCode);
  const restroName = cleanText(restaurant.RestroName);
  const stationCode = cleanText(restaurant.StationCode).toUpperCase();
  const stationName = cleanText(restaurant.StationName);
  const stationSlug = `${stationCode}-${createSlug(stationName)}`;
  const restaurantSlug = `${createSlug(restroName)}-${restroCode}`;
  const query = new URLSearchParams({ mode: "station", stationCode, stationName, minOrder: String(restaurant.MinimumOrderValue ?? 0) });
  return `/stations/${encodeURIComponent(stationSlug)}/${encodeURIComponent(restaurantSlug)}?${query.toString()}`;
}

async function getRestaurants(): Promise<Restaurant[]> {
  try {
    const response = await fetch(`${SITE_URL}/api/home/popular-restaurants`, { method: "GET", cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) return [];
    const result = (await response.json()) as RestaurantsResponse;
    if (result?.success !== true || !Array.isArray(result?.data)) return [];
    return result.data.filter((restaurant) => Number(restaurant?.RaileatsStatus) === 1 && cleanText(restaurant?.RestroCode) !== "" && cleanText(restaurant?.RestroName) !== "" && cleanText(restaurant?.StationCode) !== "");
  } catch (error) {
    console.error("Popular restaurants loading error:", error);
    return [];
  }
}

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const menuUrl = createMenuUrl(restaurant);
  const ratingValue = restaurant.RestroRating !== null && restaurant.RestroRating !== undefined ? Number(restaurant.RestroRating) : null;
  const validRating = ratingValue !== null && Number.isFinite(ratingValue) ? ratingValue : null;
  const minimumOrderValue = Number(restaurant.MinimumOrderValue ?? 0);
  const minimumOrder = Number.isFinite(minimumOrderValue) ? minimumOrderValue : 0;
  return (
    <article className="restaurant-card">
      <div className="restaurant-card-grid">
        <div className="restaurant-information">
          <h3 className="restaurant-name"><Utensils size={16} strokeWidth={2.3} aria-hidden="true" /><span>{restaurant.RestroName}</span></h3>
          <div className="restaurant-location"><MapPin size={14} strokeWidth={2.2} aria-hidden="true" /><span>{restaurant.StationName || "Railway Station"}{restaurant.StationCode ? ` (${cleanText(restaurant.StationCode).toUpperCase()})` : ""}</span></div>
          <div className="restaurant-details">
            {validRating !== null ? <span className="rating-badge"><Star size={12} fill="currentColor" strokeWidth={2} aria-hidden="true" />{validRating.toFixed(1)}</span> : null}
            <span className="minimum-order">Min Order: ₹{minimumOrder}</span>
          </div>
        </div>
        <div className="restaurant-action">
          <div className="restaurant-image-wrapper">
            {restaurant.RestroDisplayPhoto ? <img src={restaurant.RestroDisplayPhoto} alt={`${restaurant.RestroName} restaurant at ${restaurant.StationName || restaurant.StationCode} railway station`} width={220} height={176} loading="lazy" decoding="async" className="restaurant-image" /> : <div className="restaurant-placeholder"><Store size={28} strokeWidth={2} aria-hidden="true" /></div>}
          </div>
          <Link href={menuUrl} className="view-menu-button" aria-label={`View menu of ${restaurant.RestroName}`}>View Menu</Link>
        </div>
      </div>
    </article>
  );
}

export default async function PopularRestaurantsPage() {
  const restaurants = await getRestaurants();
  const restaurantSchema = {
    "@context": "https://schema.org", "@type": "ItemList", name: "Popular Restaurants for Train Food Delivery", url: PAGE_URL, numberOfItems: restaurants.length,
    itemListElement: restaurants.map((restaurant, index) => ({ "@type": "ListItem", position: index + 1, url: `${SITE_URL}${createMenuUrl(restaurant)}`, item: { "@type": "Restaurant", name: restaurant.RestroName, image: restaurant.RestroDisplayPhoto || undefined, address: { "@type": "PostalAddress", addressLocality: restaurant.StationName || restaurant.StationCode, addressCountry: "IN" }, aggregateRating: restaurant.RestroRating !== null && restaurant.RestroRating !== undefined && Number.isFinite(Number(restaurant.RestroRating)) ? { "@type": "AggregateRating", ratingValue: Number(restaurant.RestroRating), bestRating: 5, worstRating: 1, ratingCount: 1 } : undefined } })),
  };
  const breadcrumbSchema = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "Popular Restaurants for Train Journey", item: PAGE_URL }] };
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} />
      <main className="popular-restaurants-page">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">›</span><span>Popular Restaurants</span></nav>
        <section className="hero-section"><div className="eyebrow">RailEats Restaurant Partners</div><h1>Popular Restaurants for Your Train Journey</h1><p>Explore active RailEats restaurants available at railway stations across India. Enter your PNR to find restaurants that can deliver fresh food during your actual train journey.</p></section>
        <PnrSearchBox />
        {restaurants.length > 0 ? <><section className="restaurant-heading" aria-labelledby="active-restaurants-heading"><div><h2 id="active-restaurants-heading">Active Train Food Restaurants</h2><p>Browse restaurant partners currently available on RailEats.</p></div><span>{restaurants.length} {restaurants.length === 1 ? "Restaurant" : "Restaurants"}</span></section><section className="restaurant-list" aria-label="Active RailEats restaurants">{restaurants.map((restaurant) => <RestaurantCard key={String(restaurant.RestroCode)} restaurant={restaurant} />)}</section></> : <section className="empty-state"><Store size={34} strokeWidth={2} aria-hidden="true" /><h2>Restaurants are being updated</h2><p>Enter your PNR above to check restaurants available for your train route.</p></section>}
        <section className="content-section"><h2>Order Food from Popular Restaurants in Train</h2><p>RailEats helps railway passengers order food online from restaurants located near railway stations. Instead of depending only on food available inside the train, you can explore restaurant menus, select your preferred meal and place an order for delivery at an eligible station on your route.</p><div className="station-grid">{popularStations.map((station) => <Link key={station.href} href={station.href}>{station.name}</Link>)}</div></section>
        <section className="content-section"><h2>How Train Food Delivery Works</h2><div className="steps-grid"><div><CheckCircle2 size={20} aria-hidden="true" /><h3>Enter your PNR</h3><p>Use your valid 10-digit PNR to identify your train and journey details.</p></div><div><Train size={20} aria-hidden="true" /><h3>Choose a station</h3><p>Select an eligible delivery station along your route.</p></div><div><Utensils size={20} aria-hidden="true" /><h3>Select a restaurant</h3><p>Compare menus and choose food that fits your journey.</p></div><div><CheckCircle2 size={20} aria-hidden="true" /><h3>Get your food</h3><p>Enter accurate coach and seat details for delivery at the selected station.</p></div></div></section>
        <section className="content-section faq-section"><h2>Train Food Delivery FAQs</h2><div className="faq-list">{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section>
      </main>
    </>
  );
}
