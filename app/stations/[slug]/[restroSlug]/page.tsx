import type { Metadata } from "next";
import { extractStationCode } from "../../../lib/stationSlug";
import { extractRestroCode } from "../../../lib/restroSlug";
import RestroMenuClient from "./RestroMenuClient";

export const revalidate = 60;
export const runtime = "nodejs";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://www.raileats.in";

/* ================= HELPERS ================= */

function firstParam(value: any) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function titleCase(value: string) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function humanizeFromSlug(restroSlug: string) {
  return decodeURIComponent(restroSlug || "")
    .replace(/^\d+-/, "")
    .replace(/-\d+$/, "")
    .replace(/-/g, " ")
    .trim()
    .split(" ")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

function stationNameFromSlug(slug: string, stationCode: string) {
  const decoded = decodeURIComponent(slug || "");
  const withoutCode = decoded
    .replace(new RegExp(`^${stationCode}-`, "i"), "")
    .replace(/-/g, " ")
    .trim();

  return withoutCode || stationCode;
}

function buildCanonical(params: any, searchParams: any) {
  const qs = new URLSearchParams();

  Object.entries(searchParams || {}).forEach(([key, value]) => {
    const clean = firstParam(value);
    if (clean !== "") qs.set(key, String(clean));
  });

  const path = `/stations/${encodeURIComponent(params.slug || "")}/${encodeURIComponent(
    params.restroSlug || ""
  )}`;

  const query = qs.toString();
  return `${SITE_URL}${path}${query ? `?${query}` : ""}`;
}

/* ================= FETCH ================= */

async function fetchOnMenu(restroCode: string | number, arrivalTime: string) {
  if (!restroCode) return [];

  try {
    const res = await fetch(
      `${SITE_URL}/api/restro-menu?restro=${encodeURIComponent(
        String(restroCode)
      )}&arrivalTime=${encodeURIComponent(arrivalTime)}`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) return [];

    const json = await res.json().catch(() => ({}));
    return Array.isArray(json?.items) ? json.items : [];
  } catch {
    return [];
  }
}

/* ================= TIME CHECK ================= */

function toMin(value?: string | null) {
  if (!value) return null;

  const clean = String(value).slice(0, 5);
  const [h, m] = clean.split(":").map(Number);

  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function isTimeInRange(arrival: string, start?: string | null, end?: string | null) {
  const a = toMin(arrival);
  const s = toMin(start);
  const e = toMin(end);

  if (a === null || s === null || e === null) return true;

  if (s <= e) {
    return a >= s && a <= e;
  }

  return a >= s || a <= e;
}

/* ================= NORMALIZE ================= */

function normalizeCategory(category?: string | null, itemName?: string | null) {
  const cat = String(category || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  if (cat === "non-veg" || cat === "nonveg") return "Non-Veg";
  if (cat === "veg" || cat === "jain") return "Veg";

  const name = String(itemName || "").toLowerCase();

  if (
    name.includes("chicken") ||
    name.includes("egg") ||
    name.includes("fish") ||
    name.includes("mutton")
  ) {
    return "Non-Veg";
  }

  return "Veg";
}

function normalizeStatus(value: any) {
  return String(value ?? "ON").trim().toUpperCase();
}

function normalizeItem(it: any) {
  const itemName =
    it?.item_name ||
    it?.ItemName ||
    it?.name ||
    "";

  return {
    id: Number(
      it?.id ??
        it?.item_code ??
        it?.ItemCode ??
        it?.ItemId ??
        0
    ),

    item_name: itemName,

    base_price: Number(
      it?.base_price ??
        it?.BasePrice ??
        it?.selling_price ??
        it?.SellingPrice ??
        it?.restro_price ??
        it?.RestroPrice ??
        0
    ),

    item_category: normalizeCategory(
      it?.item_category ?? it?.ItemCategory,
      itemName
    ),

    menu_type:
      it?.menu_type ||
      it?.MenuType ||
      it?.item_type ||
      it?.category ||
      "Meals",

    item_description:
      it?.item_description ||
      it?.ItemDescription ||
      it?.description ||
      "",

    start_time:
      it?.start_time ||
      it?.StartTime ||
      it?.item_start_time ||
      null,

    end_time:
      it?.end_time ||
      it?.EndTime ||
      it?.item_end_time ||
      null,

    status: normalizeStatus(
      it?.status ??
        it?.Status ??
        it?.item_status ??
        it?.ItemStatus
    ),

    item_cuisine:
      it?.item_cuisine ||
      it?.ItemCuisine ||
      it?.cuisine ||
      null,
  };
}

/* ================= SEO ================= */

export async function generateMetadata({
  params,
  searchParams,
}: any): Promise<Metadata> {
  const stationCode = extractStationCode(params.slug) || "";
  const restroCode = extractRestroCode(params.restroSlug) || "";
  const outletName = humanizeFromSlug(params.restroSlug);
  const stationName = stationNameFromSlug(params.slug, stationCode);

  const deliveryDate =
    firstParam(searchParams?.deliveryDate) ||
    firstParam(searchParams?.date);

  const trainNumber = firstParam(searchParams?.train);

  const title = `${outletName} Menu - Food Delivery at ${stationName} | RailEats`;

  const description = trainNumber
    ? `Order food from ${outletName} for train ${trainNumber} at ${stationName}. View live menu, prices, veg and non-veg items, minimum order and delivery time on RailEats.`
    : `Order food from ${outletName} at ${stationName}. View menu, prices, veg and non-veg items, minimum order and delivery options on RailEats.`;

  const canonical = buildCanonical(params, searchParams);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "RailEats",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    keywords: [
      `${outletName} menu`,
      `food delivery at ${stationName}`,
      `train food delivery ${stationCode}`,
      trainNumber ? `food in train ${trainNumber}` : "",
      "RailEats",
      "order food in train",
      deliveryDate ? `train food ${deliveryDate}` : "",
    ].filter(Boolean),
    robots: {
      index: true,
      follow: true,
    },
  };
}

/* ================= PAGE ================= */

export default async function Page({
  params,
  searchParams,
}: any) {
  const stationCode = extractStationCode(params.slug) || "";
  const restroCode = extractRestroCode(params.restroSlug) || "";
  const outletName = humanizeFromSlug(params.restroSlug);
  const stationName = stationNameFromSlug(params.slug, stationCode);

  const deliveryDate =
    firstParam(searchParams?.deliveryDate) ||
    firstParam(searchParams?.date) ||
    "";

  const deliveryTime =
    firstParam(searchParams?.deliveryTime) ||
    firstParam(searchParams?.arrival)?.slice(0, 5) ||
    firstParam(searchParams?.arrivalTime)?.slice(0, 5) ||
    "";

  const trainNameRaw = firstParam(searchParams?.trainName);

  const trainName =
    trainNameRaw && trainNameRaw !== "Train"
      ? trainNameRaw
      : "";

  const trainNumber = firstParam(searchParams?.train) || "";

  const minOrderFromUrl =
    firstParam(searchParams?.minOrder) || "0";

  const arrivalTime = deliveryTime
    ? `${deliveryTime.slice(0, 5)}:00`
    : "12:00:00";

  const rawItems = await fetchOnMenu(restroCode, arrivalTime);

  const items = (rawItems || [])
    .map(normalizeItem)
    .filter((it: any) => {
      if (!it.id || !it.item_name) return false;
      if (it.status !== "ON") return false;

      return isTimeInRange(
        arrivalTime,
        it.start_time,
        it.end_time
      );
    });

  const header = {
    stationCode,
    restroCode: String(restroCode),
    outletName,
    stationName,
    minimumOrder: Number(minOrderFromUrl || 0),
  };

  const nextParams = {
    stationName,
    stationCode,
    deliveryDate,
    deliveryTime,
    trainName,
    trainNumber,
    vendorName: outletName,
    restroCode: String(restroCode),
    mode: firstParam(searchParams?.mode),
  };

  const canonical = buildCanonical(params, searchParams);

  const restaurantSchema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: outletName,
    url: canonical,
    servesCuisine: Array.from(
      new Set(items.map((it: any) => it.item_cuisine).filter(Boolean))
    ),
    menu: {
      "@type": "Menu",
      name: `${outletName} Menu`,
      hasMenuSection: Array.from(
        new Set(items.map((it: any) => it.menu_type).filter(Boolean))
      ).map((section) => ({
        "@type": "MenuSection",
        name: section,
        hasMenuItem: items
          .filter((it: any) => it.menu_type === section)
          .slice(0, 20)
          .map((it: any) => ({
            "@type": "MenuItem",
            name: it.item_name,
            description: it.item_description || undefined,
            offers: {
              "@type": "Offer",
              price: it.base_price,
              priceCurrency: "INR",
              availability: "https://schema.org/InStock",
            },
          })),
      })),
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: stationName,
      addressCountry: "IN",
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: stationName,
        item: `${SITE_URL}/stations/${encodeURIComponent(params.slug || "")}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: outletName,
        item: canonical,
      },
    ],
  };

  return (
    <main className="container-app menu-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(restaurantSchema),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      <RestroMenuClient
  header={header}
  items={items}
  nextParams={nextParams}
/>

<section className="mx-auto mt-10 max-w-[560px] rounded-3xl border bg-white p-6 shadow-sm">
  <h2 className="text-2xl font-bold text-slate-900">
    Frequently Asked Questions
  </h2>

  <div className="mt-6 space-y-5">
    <div>
      <h3 className="text-lg font-semibold text-slate-900">
        How can I view {outletName} menu at {stationName} station?
      </h3>
      <p className="mt-2 text-slate-700 leading-7">
        You can view {outletName} menu at {stationName} railway station on
        RailEats with item price, food category, description and serving time.
      </p>
    </div>

    <div>
      <h3 className="text-lg font-semibold text-slate-900">
        Does {outletName} provide food delivery in train?
      </h3>
      <p className="mt-2 text-slate-700 leading-7">
        Yes, {outletName} is listed on RailEats for food delivery in train at{" "}
        {stationName} station, depending on live availability and timing.
      </p>
    </div>

    <div>
      <h3 className="text-lg font-semibold text-slate-900">
        What details are shown in the restaurant menu?
      </h3>
      <p className="mt-2 text-slate-700 leading-7">
        The menu shows active food items with price, veg or non-veg category,
        description, cuisine, menu type and item availability time.
      </p>
    </div>
  </div>
</section>
    </main>
  );
}
