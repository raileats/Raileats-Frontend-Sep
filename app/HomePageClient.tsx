"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "./lib/useAuth";
import { supabase } from "./lib/supabaseClient";

import HeroSlider from "./components/HeroSlider";
import SearchBox from "./components/SearchBox";
import Offers from "./components/Offers";
import Steps from "./components/Steps";
import ExploreRailInfo from "./components/ExploreRailInfo";
import FooterLinks from "./components/FooterLinks";
import PartnerForm from "./components/PartnerForm";

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
    icon: "🎫",
  },
  {
    href: "/live-train-status",
    title: "Live Train Running Status",
    desc: "Spot your train and check current running status.",
    icon: "🛤️",
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
  { name: "Thali", image: "/categories/thali.png" },
  { name: "Biryani", image: "/categories/biryani.png" },
  { name: "Breakfast", image: "/categories/breakfast.png" },
  { name: "Snacks", image: "/categories/snacks.png" },
  { name: "Chinese", image: "/categories/chinese.png" },
  { name: "Tea", image: "/categories/tea.png" },
  { name: "Meals", image: "/categories/meals.png" },
  { name: "Dessert", image: "/categories/dessert.png" },
];

const MOBILE_CATEGORY_ITEMS = [...FOOD_CATEGORIES, ...FOOD_CATEGORIES];

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
  const directImage =
    restro?.RestroDisplayPhoto ||
    restro?.restroDisplayPhoto ||
    restro?.RestroDisplayImage ||
    restro?.restroDisplayImage ||
    restro?.DisplayPhoto ||
    restro?.displayPhoto ||
    restro?.DisplayImage ||
    restro?.displayImage ||
    restro?.ImageUrl ||
    restro?.imageUrl ||
    restro?.image_url ||
    restro?.image;

  const restroCode = restro?.RestroCode || restro?.restro_code || restro?.code;
  const codeImage = restroCode
    ? `https://ygisiztmuzwxpnvhwrmr.supabase.co/storage/v1/object/public/RestroDisplayPhoto/${encodeURIComponent(
        String(restroCode)
      )}.webp`
    : "/raileats-logo.png";

  const image = String(directImage || "").trim();

  if (!image) return codeImage;

  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  if (image.startsWith("/") && !image.includes("/storage/v1/object/public/")) return image;

  const cleanImage = image.replace(/^\/+/, "");
  const fileName = cleanImage.split("/").pop() || cleanImage;

  if (cleanImage.startsWith("storage/v1/object/public/")) {
    return `https://ygisiztmuzwxpnvhwrmr.supabase.co/${cleanImage}`;
  }

  if (cleanImage.includes("/storage/v1/object/public/")) {
    const storagePath = cleanImage.split("/storage/v1/object/public/").pop();
    return storagePath
      ? `https://ygisiztmuzwxpnvhwrmr.supabase.co/storage/v1/object/public/${storagePath}`
      : codeImage;
  }

  if (cleanImage.startsWith("RestroDisplayPhoto/")) {
    return `https://ygisiztmuzwxpnvhwrmr.supabase.co/storage/v1/object/public/${cleanImage}`;
  }

  if (cleanImage.startsWith("restro/") || cleanImage.startsWith("Restro/")) {
    return `https://ygisiztmuzwxpnvhwrmr.supabase.co/storage/v1/object/public/RestroDisplayPhoto/${fileName}`;
  }

  if (/\.(webp|png|jpg|jpeg)$/i.test(fileName)) {
    return `https://ygisiztmuzwxpnvhwrmr.supabase.co/storage/v1/object/public/RestroDisplayPhoto/${fileName}`;
  }

  return codeImage;
}

function getStationLabel(restro: any) {
  const stationCode = restro?.StationCode || "";
  const stationName = restro?.StationName || "";

  if (stationCode && stationName) return `${stationCode} - ${stationName}`;
  if (stationCode) return stationCode;
  if (stationName) return stationName;
  return "Available station";
}

function getRestaurantRating(restro: any) {
  const rating =
    restro?.Rating ||
    restro?.rating ||
    restro?.AverageRating ||
    restro?.RestroRating;

  const numericRating = Number(rating);

  if (Number.isFinite(numericRating) && numericRating > 0) {
    return numericRating.toFixed(1);
  }

  return "";
}

function getMinimumOrder(restro: any) {
  const value =
    restro?.MinimumOrderValue ||
    restro?.MinOrder ||
    restro?.MinimumOrder ||
    restro?.minimum_order ||
    restro?.MinOrderValue;

  const numericValue = Number(value);

  if (Number.isFinite(numericValue) && numericValue > 0) {
    return `Min order Rs ${numericValue}`;
  }

  return "";
}

function getRestaurantHref(restro: any) {
  const stationSlug = restro?.StationSlug || restro?.station_slug;
  const restroSlug = restro?.RestroSlug || restro?.restro_slug;

  if (stationSlug && restroSlug) {
    return `/stations/${stationSlug}/${restroSlug}`;
  }

  return "/popular-restaurants-train-journey";
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
  const [showPartner, setShowPartner] = useState(false);

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

    async function loadPopularRestaurantsFromApi() {
      const response = await fetch("/api/home/popular-restaurants", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (
        response.ok &&
        result?.success &&
        Array.isArray(result.data) &&
        result.data.length > 0
      ) {
        return result.data;
      }

      return [];
    }

    async function loadPopularRestaurantsFromSupabase() {
      const { data, error } = await supabase
        .from("RestroMaster")
        .select(
          [
            "RestroCode",
            "RestroName",
            "StationCode",
            "StationName",
            "RestroDisplayPhoto",
            "RaileatsStatus",
            "RestroRating",
            "MinimumOrderValue",
          ].join(",")
        )
        .eq("RaileatsStatus", 1)
        .limit(10);

      if (error) {
        console.error("Popular restaurants Supabase fallback failed:", error);
        return [];
      }

      return Array.isArray(data) ? data : [];
    }

    async function loadPopularRestaurants() {
      try {
        const apiRestaurants = await loadPopularRestaurantsFromApi();

        if (ignore) return;

        if (apiRestaurants.length > 0) {
          setPopularRestaurants(apiRestaurants);
          return;
        }

        const supabaseRestaurants = await loadPopularRestaurantsFromSupabase();

        if (!ignore) setPopularRestaurants(supabaseRestaurants);
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

  const restaurantsToShow = popularRestaurants;
  const restroListRef = useRef<HTMLDivElement | null>(null);

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
            <div className="mobile-category-track">
              {MOBILE_CATEGORY_ITEMS.map((category, index) => (
                <button
                  key={`${category.name}-${index}`}
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

          <div ref={restroListRef} className="mobile-restro-list">
            {restaurantsToShow.length === 0 ? (
              <div className="mobile-restro-card">
                <img
                  src="/raileats-logo.png"
                  alt="RailEats active restaurants"
                  title="RailEats active restaurants"
                  width={112}
                  height={96}
                  loading="lazy"
                />
                <div className="mobile-restro-copy">
                  <div className="mobile-restro-title-row">
                    <h3>Active restaurants loading</h3>
                  </div>
                  <p>Live menus</p>
                  <small>Showing only active restaurants</small>
                </div>
              </div>
            ) : (
              restaurantsToShow.map((restro) => {
              const rating = getRestaurantRating(restro);
              const minimumOrder = getMinimumOrder(restro);
              const restaurantHref = getRestaurantHref(restro);

              return (
                <Link
                  key={restro.RestroCode || restro.RestroName}
                  href={restaurantHref}
                  className="mobile-restro-card no-underline active:scale-95"
                  onClick={() => {
                    trackEvent("home_popular_restaurant_click", {
                      section: "mobile_popular_restaurants",
                      ...getTrackingUser(),
                      metadata: {
                        restroCode: restro.RestroCode || null,
                        restroName: restro.RestroName || null,
                        stationCode: restro.StationCode || null,
                        href: restaurantHref,
                      },
                    });
                  }}
                >
                  <div className="restro-image-column">
                    <div className="restro-image-wrapper">
                      <img
                        src={getRestaurantImage(restro)}
                        alt={`${restro.RestroName} food on RailEats`}
                        title={`${restro.RestroName} food delivery in train`}
                        width={112}
                        height={96}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.src = "/raileats-logo.png";
                        }}
                      />

                      {rating && (
                        <div className="restro-rating-badge" aria-hidden>
                          {rating} ★
                        </div>
                      )}
                    </div>

                    <div className="mobile-restro-viewmenu">View Menu</div>
                  </div>

                  <div className="mobile-restro-copy">
                    <div className="mobile-restro-title-row">
                      <h3>{restro.RestroName}</h3>
                    </div>

                    <p className="mobile-restro-station">{getStationLabel(restro)}</p>

                    {minimumOrder ? (
                      <small className="mobile-restro-minorder">{minimumOrder}</small>
                    ) : (
                      <small className="mobile-restro-minorder">Available restaurant</small>
                    )}
                  </div>
                </Link>
              );
            })
            )}
          </div>
        </section>
      </section>

      {/* Mobile: auto-slide popular restaurants in pairs */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              try{
                const container = document.querySelector('.mobile-restro-list');
                if(!container) return;

                let autoId = null;
                let idx = 0;
                const total = Math.ceil(container.children.length / 2) || 1;
                const startAuto = ()=>{
                  stopAuto();
                  autoId = setInterval(()=>{
                    idx = (idx + 1) % total;
                    container.scrollTo({ left: idx * container.clientWidth, behavior: 'smooth' });
                  }, 2000);
                };
                const stopAuto = ()=>{ if(autoId){ clearInterval(autoId); autoId = null; } };

                // start only on small screens
                function shouldRun(){ return window.innerWidth < 768; }

                if(!shouldRun()) return;
                // set up snapping after user scroll
                let scrub = null;
                container.addEventListener('scroll', ()=>{
                  if(scrub) clearTimeout(scrub);
                  scrub = setTimeout(()=>{
                    const group = Math.round(container.scrollLeft / container.clientWidth);
                    idx = Math.max(0, Math.min(group, total - 1));
                    container.scrollTo({ left: idx * container.clientWidth, behavior: 'smooth' });
                  }, 120);
                }, { passive: true });

                // pause on pointer enter
                container.addEventListener('pointerenter', stopAuto);
                container.addEventListener('pointerleave', startAuto);

                startAuto();
                window.addEventListener('resize', ()=>{
                  if(!shouldRun()) stopAuto(); else startAuto();
                });
              }catch(e){ console.error(e); }
            })();
          `,
        }}
      />

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

        <div className="grid gap-2 sm:grid-cols-2">
          {RAILWAY_TOOL_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => handleToolLinkClick(item.href, item.title)}
              className="app-card-compact flex items-start gap-2.5 p-3 no-underline transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50 text-base">
                {item.icon}
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                  {item.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-app">
        <div className="app-card p-4 sm:p-5">
          <p className="text-xs font-black uppercase tracking-wide text-orange-600">
            RailEats Partner
          </p>

          <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950">
            Become Restaurant Partner
          </h2>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            Join RailEats and receive food orders from train passengers at
            supported railway stations.
          </p>

          <button
            type="button"
            onClick={() => setShowPartner(true)}
            className="mt-4 rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-sm active:scale-95"
          >
            Become Restaurant Partner
          </button>
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

      {showPartner && <PartnerForm onClose={() => setShowPartner(false)} />}
    </main>
  );
}
