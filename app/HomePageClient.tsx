"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "./lib/useAuth";
import { supabase } from "./lib/supabaseClient";

import HeroSlider from "./components/HeroSlider";
import SearchBox from "./components/SearchBox";
import Offers from "./components/Offers";
import Steps from "./components/Steps";
import ExploreRailInfo from "./components/ExploreRailInfo";
import FooterLinks from "./components/FooterLinks";

const TRAIN_FOOD_LINKS = [
  {
    href: "/order-food-in-train",
    title: "Order Food in Train",
    desc: "Book fresh meals online for your train journey.",
  },
  {
    href: "/book-food-in-train",
    title: "Book Food in Train",
    desc: "Search by PNR or train and choose restaurants on your route.",
  },
  {
    href: "/food-delivery-in-train",
    title: "Food Delivery in Train",
    desc: "Get food delivered to your seat at available stations.",
  },
  {
    href: "/train-food-delivery",
    title: "Train Food Delivery",
    desc: "Find train food options from RailEats restaurant partners.",
  },
  {
    href: "/best-food-delivery-in-train",
    title: "Best Food Delivery in Train",
    desc: "Compare fresh meal options for your railway journey.",
  },
  {
    href: "/food-delivery-in-train-from-restaurants",
    title: "Food Delivery in Train from Restaurants",
    desc: "Order meals from available restaurants on your train route.",
  },
];

const RAILWAY_TOOL_LINKS = [
  {
    href: "/pnr-status",
    title: "Check PNR Status",
    desc: "View train, journey, chart, coach and seat details.",
  },
  {
    href: "/live-train-status",
    title: "Live Train Running Status",
    desc: "Spot your train and check current running status.",
  },
];

const APP_OFFER_BANNERS = [
  {
    title: "Fresh train meals",
    desc: "Order before your station arrives",
    accent: "from-orange-500 to-amber-400",
  },
  {
    title: "Seat delivery",
    desc: "Food delivered at available stations",
    accent: "from-emerald-500 to-lime-400",
  },
  {
    title: "Route restaurants",
    desc: "Compare menus on your journey",
    accent: "from-slate-900 to-slate-700",
  },
];

const FOOD_CATEGORIES = [
  {
    name: "Thali",
    image: "/categories/thali.png",
  },
  {
    name: "Biryani",
    image: "/categories/biryani.png",
  },
  {
    name: "Breakfast",
    image: "/categories/breakfast.png",
  },
  {
    name: "Snacks",
    image: "/categories/snacks.png",
  },
  {
    name: "Chinese",
    image: "/categories/chinese.png",
  },
  {
    name: "Tea",
    image: "/categories/tea.png",
  },
  {
    name: "Meals",
    image: "/categories/meals.png",
  },
  {
    name: "Dessert",
    image: "/categories/dessert.png",
  },
];

const RESTAURANT_PREVIEWS = [
  {
    RestroCode: "fallback-station-restaurant",
    RestroName: "Station Restaurant",
    StationCode: "",
    StationName: "Available station",
    RestroDisplayPhoto:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
  },
  {
    RestroCode: "fallback-raileats-partner-kitchen",
    RestroName: "RailEats Partner Kitchen",
    StationCode: "",
    StationName: "Available station",
    RestroDisplayPhoto:
      "https://images.unsplash.com/photo-1563379091339-03246963d51a?auto=format&fit=crop&w=800&q=80",
  },
  {
    RestroCode: "fallback-fresh-food-counter",
    RestroName: "Fresh Food Counter",
    StationCode: "",
    StationName: "Available station",
    RestroDisplayPhoto:
      "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=800&q=80",
  },
];

function getSessionId() {
  if (typeof window === "undefined") return "";

  const key = "raileats_session_id";
  let sessionId = localStorage.getItem(key);

  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, sessionId);
  }

  return sessionId;
}

async function trackEvent(
  event_name: string,
  payload: {
    section?: string;
    email?: string | null;
    mobile?: string | null;
    user_name?: string | null;
    metadata?: Record<string, any>;
  } = {}
) {
  try {
    if (typeof window === "undefined") return;

    await fetch("/api/website-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event_name,
        section: payload.section || null,
        email: payload.email || null,
        mobile: payload.mobile || null,
        user_name: payload.user_name || null,
        page_url: window.location.href,
        page_path: window.location.pathname,
        session_id: getSessionId(),
        device:
          window.innerWidth < 640
            ? "mobile"
            : window.innerWidth < 1024
            ? "tablet"
            : "desktop",
        browser: navigator.userAgent.includes("Edg")
          ? "Edge"
          : navigator.userAgent.includes("Chrome")
          ? "Chrome"
          : navigator.userAgent.includes("Firefox")
          ? "Firefox"
          : navigator.userAgent.includes("Safari")
          ? "Safari"
          : "Other",
        metadata: payload.metadata || {},
      }),
    });
  } catch (err) {
    console.error("trackEvent failed:", err);
  }
}

function scrollToSearchBox() {
  const mobileSearchShell = document.querySelector(".mobile-search-shell");

  if (mobileSearchShell) {
    mobileSearchShell.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    return;
  }

  document.getElementById("order-food")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function getRestaurantImage(restro: any) {
  return restro?.RestroDisplayPhoto || "/raileats-logo.png";
}

function getStationLabel(restro: any) {
  const stationCode = restro?.StationCode || "";
  const stationName = restro?.StationName || "";

  if (stationCode && stationName) return `${stationCode} - ${stationName}`;
  if (stationCode) return stationCode;
  if (stationName) return stationName;
  return "Available station";
}

export default function HomePageClient() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkName, setBulkName] = useState("");
  const [bulkMobile, setBulkMobile] = useState("");
  const [bulkTrain, setBulkTrain] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [popularRestaurants, setPopularRestaurants] = useState<any[]>([]);

  const getTrackingUser = () => ({
    email: user?.email || null,
    mobile: user?.mobile || null,
    user_name: user?.name || null,
  });

  const formatMobile = (value: string) => value.replace(/\D/g, "").slice(0, 10);

  useEffect(() => {
    trackEvent("home_page_view", {
      section: "home",
      ...getTrackingUser(),
      metadata: {
        source: "home_page",
      },
    });
  }, [user?.email, user?.mobile, user?.name]);

  useEffect(() => {
  let ignore = false;

  async function loadPopularRestaurants() {
    try {
      const response = await fetch("/api/home/popular-restaurants", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (ignore) return;

      if (
        response.ok &&
        result?.success &&
        Array.isArray(result.data) &&
        result.data.length > 0
      ) {
        setPopularRestaurants(result.data);
      } else {
        setPopularRestaurants([]);
      }
    } catch (err) {
      console.error("Popular restaurants fetch failed:", err);
      if (!ignore) setPopularRestaurants([]);
    }
  }

  loadPopularRestaurants();

  return () => {
    ignore = true;
  };
}, []);
  useEffect(() => {
    const goto = searchParams.get("goto");

    if (goto === "offers") {
      setTimeout(() => {
        document.getElementById("offers")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);

      trackEvent("home_goto_offers", {
        section: "home_offers",
        ...getTrackingUser(),
      });
    }

    if (goto === "bulk-order") {
      setBulkOpen(true);

      trackEvent("home_bulk_order_modal_open_query", {
        section: "home_bulk_order",
        ...getTrackingUser(),
      });
    }
  }, [searchParams]);

  useEffect(() => {
    const afterLoginAction = localStorage.getItem("raileats_after_login_action");

    if (afterLoginAction === "bulk_order") {
      localStorage.removeItem("raileats_after_login_action");
      setBulkOpen(true);

      trackEvent("home_bulk_order_modal_open_after_login", {
        section: "home_bulk_order",
        ...getTrackingUser(),
      });
    }
  }, [user?.mobile]);

  const handleBulkSubmit = async () => {
    const mobile = formatMobile(bulkMobile);

    if (!bulkName.trim()) {
      alert("Name enter karo");
      return;
    }

    if (mobile.length !== 10) {
      alert("Valid 10 digit mobile number enter karo");
      return;
    }

    try {
      setBulkLoading(true);

      trackEvent("home_bulk_order_submit_click", {
        section: "home_bulk_order",
        mobile,
        user_name: bulkName.trim(),
        email: user?.email || null,
        metadata: {
          train: bulkTrain.trim(),
          message: bulkMessage.trim(),
        },
      });

      const { error } = await supabase.from("BulkOrderRequests").insert({
        Name: bulkName.trim(),
        Mobile: mobile,
        TrainNumber: bulkTrain.trim() || null,
        Message: bulkMessage.trim() || null,
        Status: "New",
        Source: "Customer Website",
        CreatedAt: new Date().toISOString(),
      });

      if (error) throw error;

      trackEvent("home_bulk_order_submit_success", {
        section: "home_bulk_order",
        mobile,
        user_name: bulkName.trim(),
      });

      alert("Bulk order request received. RailEats team will contact you soon.");

      setBulkName("");
      setBulkMobile("");
      setBulkTrain("");
      setBulkMessage("");
      setBulkOpen(false);
    } catch (err) {
      console.error("Bulk order request failed:", err);

      trackEvent("home_bulk_order_submit_failed", {
        section: "home_bulk_order",
        mobile,
        user_name: bulkName.trim(),
      });

      alert("Bulk order request submit nahi ho paya. Please try again.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSeoLinkClick = (href: string, title: string) => {
    trackEvent("home_seo_internal_link_click", {
      section: "home_popular_train_food_searches",
      ...getTrackingUser(),
      metadata: {
        href,
        title,
      },
    });
  };

  const handleToolLinkClick = (href: string, title: string) => {
    trackEvent("home_railway_tool_link_click", {
      section: "home_railway_tools",
      ...getTrackingUser(),
      metadata: {
        href,
        title,
      },
    });
  };

  const restaurantsToShow =
    popularRestaurants.length > 0 ? popularRestaurants : RESTAURANT_PREVIEWS;

  return (
    <main className="customer-app-main home-app-shell">
      <section className="mobile-native-home app-first-home" aria-label="RailEats home">
        <div className="mobile-home-hero">
          <div className="home-hero-slider-slot" aria-label="RailEats offers and highlights">
            <HeroSlider />
          </div>

          <div className="mobile-search-shell">
            <SearchBox />
          </div>
        </div>

        <section className="mobile-category-section" aria-labelledby="food-category-title">
          <div className="mobile-section-head">
            <h2 id="food-category-title">What are you craving?</h2>
            <span>Swipe</span>
          </div>
          <div className="mobile-category-row">
            {FOOD_CATEGORIES.map((category) => (
              <button
                key={category.name}
                type="button"
                className="mobile-category-pill active:scale-95"
                onClick={() => {
                  scrollToSearchBox();
                  trackEvent("home_mobile_category_click", {
                    section: "mobile_categories",
                    ...getTrackingUser(),
                    metadata: { category: category.name },
                  });
                }}
              >
                <img
                  src={category.image}
                  alt={`${category.name} food category on RailEats`}
                  title={`${category.name} food on train`}
                  width={64}
                  height={64}
                  loading="lazy"
                  className="h-16 w-16 rounded-full object-cover shadow-sm"
                />
                <strong>{category.name}</strong>
              </button>
            ))}
          </div>
        </section>

        <div className="mobile-offer-rail" aria-label="RailEats offers">
          {APP_OFFER_BANNERS.map((offer) => (
            <article
              key={offer.title}
              className={`mobile-offer-card bg-gradient-to-br ${offer.accent}`}
            >
              <span>RailEats special</span>
              <strong>{offer.title}</strong>
              <p>{offer.desc}</p>
            </article>
          ))}
        </div>


        <section className="mobile-restro-section" aria-labelledby="mobile-restro-title">
          <div className="mobile-section-head">
            <h2 id="mobile-restro-title">Popular Restaurants</h2>
            <Link href="/popular-restaurants-train-journey">Live menus</Link>
          </div>
          <div className="mobile-restro-list">
            {restaurantsToShow.map((restro) => (
              <article key={restro.RestroCode || restro.RestroName} className="mobile-restro-card">
                <img
                  src={getRestaurantImage(restro)}
                  alt={`${restro.RestroName} food on RailEats`}
                  title={`${restro.RestroName} food delivery in train`}
                  width={112}
                  height={96}
                  loading="lazy"
                />
                <div className="mobile-restro-copy">
                  <div className="mobile-restro-title-row">
                    <h3>{restro.RestroName}</h3>
                  </div>
                  <p>{getStationLabel(restro)}</p>
                  <small>Available restaurant</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <div className="hidden">
        <HeroSlider />
        <SearchBox />
      </div>

      <div className="mobile-hide-app-junk">
        <ExploreRailInfo />
      </div>

      <Offers />

      <section className="container-app desktop-seo-rich">
        <div className="app-card p-4 sm:p-5">
          <p className="text-xs font-black uppercase tracking-wide text-orange-600">
            Train food delivery
          </p>

          <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
            Order food in train with RailEats
          </h2>

          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
            RailEats helps passengers book food in train by PNR, train number or
            station. Search your journey, choose available restaurants, add food
            items to cart and get fresh meals delivered to your seat.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-black text-slate-950">
                Search Journey
              </div>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                Enter PNR, train number or station to find food delivery options.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-black text-slate-950">
                Choose Restaurant
              </div>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                View restaurants, menu, prices, minimum order and delivery time.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-black text-slate-950">
                Get Seat Delivery
              </div>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                Place your order and receive food at your selected railway station.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-app desktop-seo-rich">
        <div className="mb-3">
          <h2 className="app-section-title">Popular Train Food Searches</h2>
          <p className="app-muted text-sm">
            Quick links for passengers searching food delivery in train.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {TRAIN_FOOD_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => handleSeoLinkClick(item.href, item.title)}
              className="app-card-compact block p-4 no-underline transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
            >
              <h3 className="text-base font-black text-slate-950">
                {item.title}
              </h3>
              <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">
                {item.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-app mobile-tools-strip">
        <div className="mb-3">
          <h2 className="app-section-title">Useful Railway Tools</h2>
          <p className="app-muted text-sm">
            Check railway information before ordering food.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {RAILWAY_TOOL_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => handleToolLinkClick(item.href, item.title)}
              className="app-card-compact block p-4 no-underline transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <h3 className="text-base font-black text-slate-950">
                {item.title}
              </h3>
              <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">
                {item.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="mobile-hide-app-junk">
        <Steps />
      </div>

      <section className="container-app desktop-seo-rich">
        <div className="app-card p-4 sm:p-5">
          <h2 className="text-xl font-black text-slate-950">
            Why RailEats for train food delivery?
          </h2>

          <div className="mt-4 space-y-4 text-sm font-semibold leading-6 text-slate-600">
            <p>
              RailEats is built for passengers who want simple and reliable food
              delivery in train. You can search your train route, compare
              restaurants at available stations and order meals based on delivery
              date, arrival time and restaurant availability.
            </p>

            <p>
              The system checks station availability, restaurant timing, minimum
              order value, cut-off time and menu item timing before showing food
              options. This helps customers order from restaurants that can serve
              the train journey properly.
            </p>

            <p>
              Passengers can also use RailEats to check PNR status and live train
              running status before ordering food for their journey.
            </p>
          </div>
        </div>
      </section>

      <div className="mobile-hide-app-junk">
        <FooterLinks />
      </div>

      {bulkOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Bulk Order Request
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Group order ke liye details bhejein. RailEats team contact karegi.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setBulkOpen(false);
                  trackEvent("home_bulk_order_modal_close", {
                    section: "home_bulk_order",
                    ...getTrackingUser(),
                  });
                }}
                className="h-9 w-9 rounded-full border border-slate-200 bg-white text-lg font-black text-slate-700"
              >
                x
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <input
                value={bulkName}
                onChange={(e) => setBulkName(e.target.value)}
                placeholder="Name"
                className="app-input"
              />

              <input
                value={bulkMobile}
                onChange={(e) => setBulkMobile(formatMobile(e.target.value))}
                placeholder="10 digit mobile"
                inputMode="numeric"
                className="app-input"
              />

              <input
                value={bulkTrain}
                onChange={(e) => setBulkTrain(e.target.value)}
                placeholder="Train number / journey details"
                className="app-input"
              />

              <textarea
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                placeholder="Order details, passenger count, station, date"
                rows={4}
                className="app-input min-h-[110px] py-3"
              />

              <button
                type="button"
                onClick={handleBulkSubmit}
                disabled={bulkLoading}
                className="app-btn-primary w-full"
              >
                {bulkLoading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
