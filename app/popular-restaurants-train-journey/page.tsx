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
  description: "Explore popular restaurants for train food delivery across railway stations in India. Enter your PNR and order fresh food online during your train journey with RailEats.",
  keywords: ["popular restaurants in train", "train food delivery", "food delivery in train", "order food in train", "railway food delivery", "online food order in train", "restaurant food in train", "PNR food delivery", "RailEats"],
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: { type: "website", url: PAGE_URL, siteName: "RailEats", title: "Popular Restaurants for Train Food Delivery | RailEats", description: "Discover popular railway station restaurants and order fresh food for delivery directly to your train seat.", images: [{ url: `${SITE_URL}/raileats-logo.png`, width: 1200, height: 630, alt: "RailEats train food delivery" }] },
  twitter: { card: "summary_large_image", title: "Popular Restaurants for Train Food Delivery | RailEats", description: "Explore restaurants at railway stations and order food online during your train journey.", images: [`${SITE_URL}/raileats-logo.png`] },
};

type Restaurant = { RestroCode: string | number; RestroName: string; StationCode: string; StationName: string; RestroDisplayPhoto?: string | null; RaileatsStatus?: number | null; RestroRating?: number | null; MinimumOrderValue?: number | null };
type RestaurantsResponse = { success?: boolean; count?: number; data?: Restaurant[]; error?: string };
const popularStations = [{ name: "Food Delivery at Lalitpur Junction", href: "/stations/LAR-lalitpur-jn" }, { name: "Food Delivery at Jabalpur Junction", href: "/stations/JBP-jabalpur" }, { name: "Food Delivery at Khandwa Junction", href: "/stations/KNW-khandwa" }, { name: "Food Delivery at Ratlam Junction", href: "/stations/RTM-ratlam" }, { name: "Food Delivery at Ahmedabad Junction", href: "/stations/ADI-ahmedabad-jn" }, { name: "Food Delivery at Vijayawada Junction", href: "/stations/BZA-vijayawada-jn" }];
const faqs = [{ question: "How can I order food from a restaurant in train?", answer: "Enter your valid 10-digit PNR on RailEats. The system checks your train route, journey date, arrival time and available railway stations. You can then select an eligible restaurant, add food to your cart and complete the order." }, { question: "Can food be delivered directly to my train seat?", answer: "Yes. Enter the correct PNR, coach and seat details while placing the order. The selected restaurant prepares the food and delivers it at your chosen railway station, subject to route and restaurant availability." }, { question: "Which railway stations have RailEats restaurants?", answer: "RailEats works with restaurants at multiple railway stations across India. The available stations and restaurants depend on your train route, journey date, delivery time and the restaurant's current operating status." }, { question: "Can I view a restaurant menu before ordering?", answer: "Yes. Select View Menu on any restaurant card to explore available food items, prices and the minimum order value for that outlet." }, { question: "Why is a restaurant not available for my train?", answer: "Availability may depend on whether the station falls on your train route, restaurant opening hours, delivery cut-off time, journey date and the restaurant's active status." }, { question: "Do I need a PNR to order food in train?", answer: "A valid PNR is recommended because it helps RailEats identify your train, journey date and eligible delivery stations. Always enter accurate journey details for successful delivery." }];
function cleanText(value: unknown) { return String(value ?? "").trim(); }
function createSlug(value: unknown) { return cleanText(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function createMenuUrl(restaurant: Restaurant) { const restroCode = cleanText(restaurant.RestroCode); const restroName = cleanText(restaurant.RestroName); const stationCode = cleanText(restaurant.StationCode).toUpperCase(); const stationName = cleanText(restaurant.StationName); const stationSlug = `${stationCode}-${createSlug(stationName)}`; const restaurantSlug = `${createSlug(restroName)}-${restroCode}`; const query = new URLSearchParams({ mode: "station", stationCode, stationName, minOrder: String(restaurant.MinimumOrderValue ?? 0) }); return `/stations/${encodeURIComponent(stationSlug)}/${encodeURIComponent(restaurantSlug)}?${query.toString()}`; }
async function getRestaurants(): Promise<Restaurant[]> { try { const response = await fetch(`${SITE_URL}/api/home/popular-restaurants`, { method: "GET", cache: "no-store", headers: { Accept: "application/json" } }); if (!response.ok) return []; const result = (await response.json()) as RestaurantsResponse; if (result?.success !== true || !Array.isArray(result?.data)) return []; return result.data.filter((restaurant) => Number(restaurant?.RaileatsStatus) === 1 && cleanText(restaurant?.RestroCode) !== "" && cleanText(restaurant?.RestroName) !== "" && cleanText(restaurant?.StationCode) !== ""); } catch { return []; } }
function RestaurantCard({ restaurant }: { restaurant: Restaurant }) { const menuUrl = createMenuUrl(restaurant); return <article className="restaurant-card"><div className="restaurant-card-grid"><div className="restaurant-information"><h3 className="restaurant-name"><Utensils size={16} aria-hidden="true" /><span>{restaurant.RestroName}</span></h3><div className="restaurant-location"><MapPin size={14} aria-hidden="true" /><span>{restaurant.StationName || "Railway Station"}{restaurant.StationCode ? ` (${cleanText(restaurant.StationCode).toUpperCase()})` : ""}</span></div></div><div className="restaurant-action"><Link href={menuUrl} className="view-menu-button" aria-label={`View menu of ${restaurant.RestroName}`}>View Menu</Link></div></div></article>; }
export default async function PopularRestaurantsPage() { const restaurants = await getRestaurants(); const breadcrumbSchema = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "Popular Restaurants for Train Journey", item: PAGE_URL }] }; return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c") }} /><main className="popular-restaurants-page"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">›</span><span>Popular Restaurants</span></nav><section className="hero-section"><h1>Popular Restaurants for Your Train Journey</h1></section><PnrSearchBox />{restaurants.map((restaurant) => <RestaurantCard key={String(restaurant.RestroCode)} restaurant={restaurant} />)}<section className="content-section"><h2>Popular Railway Stations for Food Delivery</h2><div className="station-links">{popularStations.map((station) => <Link key={station.href} href={station.href}>{station.name}</Link>)}</div></section><section className="content-section"><h2>Frequently Asked Questions</h2>{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</section><section className="final-cta"><Train size={30} aria-hidden="true" /><h2>Find Food Available on Your Train Route</h2><Link href="/">Order Food in Train</Link></section></main></>; }
