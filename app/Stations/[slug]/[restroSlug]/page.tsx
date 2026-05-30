import React from "react";
import type { Metadata } from "next";
import { extractStationCode } from "../../../lib/stationSlug";
import { extractRestroCode } from "../../../lib/restroSlug";
import RestroMenuClient from "./RestroMenuClient";

export const revalidate = 60;
export const runtime = "nodejs";

const SITE_URL = "https://www.raileats.in";

function humanizeFromSlug(slug: string) {
  return decodeURIComponent(slug || "")
    .split("-")
    .filter(Boolean)
    .slice(1)
    .join(" ")
    .trim();
}

function cleanTitle(value: string) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTime(value: any) {
  const raw = String(value || "").trim();
  if (!raw) return "12:00:00";
  if (/^\d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
  return raw;
}

function buildCanonical(params: any, searchParams: any) {
  const query = new URLSearchParams();

  ["deliveryDate", "deliveryTime", "arrival", "train", "trainName", "boarding", "minOrder"].forEach(
    (key) => {
      const value = searchParams?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        query.set(key, String(value));
      }
    }
  );

  const qs = query.toString();
  return `${SITE_URL}/Stations/${params.slug}/${params.restroSlug}${qs ? `?${qs}` : ""}`;
}

async function fetchOnMenu(restroCode: string, arrivalTime: string) {
  try {
    const url = `https://raileats.in/api/restro-menu?restro=${encodeURIComponent(
      restroCode
    )}&arrivalTime=${encodeURIComponent(arrivalTime)}`;

    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));

    return Array.isArray(json?.items) ? json.items : [];
  } catch (error) {
    console.error("menu fetch failed", error);
    return [];
  }
}

function toMin(time: string) {
  const [h = "0", m = "0"] = String(time || "00:00").split(":");
  return Number(h) * 60 + Number(m);
}

function isTimeInRange(arrival: string, start: string, end: string) {
  if (!start || !end) return true;

  const a = toMin(arrival);
  const s = toMin(start);
  const e = toMin(end);

  if (s <= e) return a >= s && a <= e;
  return a >= s || a <= e;
}

function normalizeCategory(category: any, itemName: any) {
  const raw = String(category || "").trim();
  if (raw) return raw;

  const name = String(itemName || "").toLowerCase();

  if (/(chicken|mutton|fish|egg|non[-\s]?veg)/i.test(name)) return "Non-Veg";
  if (/jain/i.test(name)) return "Jain";

  return "Veg";
}

function formatDateLabel(value: any) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return raw;
  }
}

function buildPageContext(params: any, searchParams: any) {
  const stationCode = extractStationCode(params.slug);
  const restroCode = extractRestroCode(params.restroSlug);

  const outletName =
    humanizeFromSlug(params.restroSlug) || `Restaurant ${restroCode}`;

  const stationName =
    decodeURIComponent(params.slug || "")
      .split("-")
      .slice(1)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim() || stationCode;

  const deliveryDate = String(searchParams?.deliveryDate || "");
  const deliveryTime = String(searchParams?.deliveryTime || searchParams?.arrival || "");
  const arrivalTime = normalizeTime(deliveryTime);

  const trainNumber = String(searchParams?.train || "");
  const trainName =
    String(searchParams?.trainName || "").trim() &&
    String(searchParams?.trainName || "").trim().toLowerCase() !== "train"
      ? String(searchParams?.trainName)
      : "";

  const minOrder = String(searchParams?.minOrder || "");

  return {
    stationCode,
    restroCode,
    outletName: cleanTitle(outletName),
    stationName: cleanTitle(stationName),
    deliveryDate,
    deliveryTime,
    arrivalTime,
    trainNumber,
    trainName,
    minOrder,
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: any;
  searchParams: any;
}): Promise<Metadata> {
  const ctx = buildPageContext(params, searchParams);
  const canonical = buildCanonical(params, searchParams);

  const title = `Order food from ${ctx.outletName} at ${ctx.stationName} | RailEats`;
  const description = ctx.trainNumber
    ? `Order fresh food from ${ctx.outletName} for train ${ctx.trainNumber} at ${ctx.stationName}. Check available menu, prices, delivery time and place your train food order online.`
    : `Order fresh food from ${ctx.outletName} at ${ctx.stationName}. Check menu, prices, delivery time and place your food order online with RailEats.`;

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
  };
}

export default async function RestroMenuPage({
  params,
  searchParams,
}: {
  params: any;
  searchParams: any;
}) {
  const ctx = buildPageContext(params, searchParams);

  const rawItems = await fetchOnMenu(ctx.restroCode, ctx.arrivalTime);

  const items = rawItems
    .map((item: any) => ({
      id: String(item.item_code ?? item.ItemCode ?? item.id ?? ""),
      item_name: String(item.item_name ?? item.ItemName ?? item.name ?? ""),
      base_price: Number(item.base_price ?? item.BasePrice ?? item.price ?? 0),
      item_category: normalizeCategory(
        item.item_category ?? item.ItemCategory,
        item.item_name ?? item.ItemName
      ),
      menu_type: String(item.menu_type ?? item.MenuType ?? ""),
      item_description: String(
        item.item_description ?? item.ItemDescription ?? item.description ?? ""
      ),
      start_time: String(item.start_time ?? item.ItemStart ?? item.startTime ?? ""),
      end_time: String(item.end_time ?? item.ItemClosed ?? item.endTime ?? ""),
      status: String(item.status ?? item.Status ?? "ON"),
      item_cuisine: String(item.item_cuisine ?? item.ItemCuisine ?? ""),
    }))
    .filter((item: any) => {
      const status = String(item.status || "").toUpperCase();
      return (
        ["ON", "ACTIVE", "TRUE", "1"].includes(status) &&
        isTimeInRange(ctx.arrivalTime, item.start_time, item.end_time)
      );
    });

  const header = {
    stationCode: ctx.stationCode,
    restroCode: ctx.restroCode,
    outletName: ctx.outletName,
    stationName: ctx.stationName,
    minimumOrder: ctx.minOrder,
  };

  const nextParams = {
    deliveryDate: ctx.deliveryDate,
    deliveryTime: ctx.deliveryTime,
    arrival: searchParams?.arrival || ctx.deliveryTime,
    train: ctx.trainNumber,
    trainName: ctx.trainName || "Train",
    boarding: searchParams?.boarding || "",
    minOrder: ctx.minOrder,
    restroCode: ctx.restroCode,
    restroName: ctx.outletName,
    stationCode: ctx.stationCode,
    stationName: ctx.stationName,
  };

  const canonical = buildCanonical(params, searchParams);
  const uniqueCuisines = Array.from(
    new Set(items.map((item: any) => item.item_cuisine).filter(Boolean))
  );

  const restaurantSchema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: ctx.outletName,
    url: canonical,
    servesCuisine: uniqueCuisines.length ? uniqueCuisines : ["Indian"],
    address: {
      "@type": "PostalAddress",
      addressLocality: ctx.stationName,
      addressCountry: "IN",
    },
    areaServed: {
      "@type": "TrainStation",
      name: `${ctx.stationName} (${ctx.stationCode})`,
    },
    hasMenu: canonical,
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${ctx.outletName} menu at ${ctx.stationName}`,
    itemListElement: items.slice(0, 25).map((item: any, index: number) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: item.item_name,
        description: item.item_description || `${item.item_category} food item`,
        category: item.menu_type || item.item_category,
        offers: {
          "@type": "Offer",
          price: item.base_price,
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
        },
      },
    })),
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
        name: `Train food at ${ctx.stationName}`,
        item: `${SITE_URL}/trains`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: ctx.outletName,
        item: canonical,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <main className="container-app">
        <RestroMenuClient header={header} items={items} nextParams={nextParams} />
      </main>
    </>
  );
}
