import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { serviceClient } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const siteUrl = "https://www.raileats.in";
const siteName = "RailEats";
const defaultImage = "/raileats-logo.png";
const defaultRestroImage = "/categories/thali.png";

function titleCase(str: string) {
  return String(str || "")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .replace(/\bJn\b/g, "JN");
}

function parseStationFromSlug(slugRaw: string) {
  const slug = decodeURIComponent(String(slugRaw || "")).trim();

  if (/^[A-Za-z0-9]{2,8}$/.test(slug)) {
    return {
      code: slug.toUpperCase(),
      name: slug.toUpperCase(),
      isCodeOnly: true,
    };
  }

  const clean = slug
    .replace(/-food-delivery-in-train$/i, "")
    .replace(/-food-delivery$/i, "");

  const parts = clean.split("-").filter(Boolean);
  const code = String(parts.pop() || "").toUpperCase();
  const name = titleCase(parts.join(" "));

  return {
    code,
    name: name || code || "Railway Station",
    isCodeOnly: false,
  };
}

function isActive(value: any) {
  const v = String(value ?? "").trim().toLowerCase();
  return (
    value === true ||
    value === 1 ||
    v === "1" ||
    v === "on" ||
    v === "active" ||
    v === "true" ||
    v === "yes"
  );
}

function isHolidayOn(value: any) {
  const v = String(value ?? "").trim().toLowerCase();
  return (
    value === true ||
    value === 1 ||
    v === "1" ||
    v === "on" ||
    v === "active" ||
    v === "true" ||
    v === "yes"
  );
}

function safeRating(value: any) {
  if (value === null || value === undefined || value === "") return "New";
  return value;
}

function restroImage(r: any) {
  const rawImage =
    r?.RestroDisplayPhoto ||
    r?.restroDisplayPhoto ||
    r?.RestroDisplayImage ||
    r?.restroDisplayImage ||
    r?.DisplayPhoto ||
    r?.displayPhoto ||
    r?.DisplayImage ||
    r?.displayImage ||
    r?.RestaurantImage ||
    r?.restaurantImage ||
    r?.RestaurantPhoto ||
    r?.restaurantPhoto ||
    r?.RestroPhoto ||
    r?.restroPhoto ||
    r?.RestroImageUrl ||
    r?.RestroImageURL ||
    r?.restroImageUrl ||
    r?.RestroImage ||
    r?.restroImage ||
    r?.image ||
    r?.Image ||
    r?.photo ||
    r?.Photo ||
    r?.logo ||
    r?.Logo ||
    "";

  const image = String(rawImage || "").trim();

  if (!image) return defaultRestroImage;

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  if (
    image.startsWith("/") &&
    !image.startsWith("/storage/") &&
    !image.includes("/storage/v1/object/public/")
  ) {
    return image;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL ||
    "";

  if (!supabaseUrl) return defaultRestroImage;

  const cleanSupabaseUrl = supabaseUrl.replace(/\/$/, "");
  const cleanImage = image.replace(/^\/+/, "");

  if (cleanImage.startsWith("storage/v1/object/public/")) {
    return `${cleanSupabaseUrl}/${cleanImage}`;
  }

  if (cleanImage.includes("/storage/v1/object/public/")) {
    const storagePath = cleanImage.split("/storage/v1/object/public/").pop() || "";
    return `${cleanSupabaseUrl}/storage/v1/object/public/${storagePath}`;
  }

  return `${cleanSupabaseUrl}/storage/v1/object/public/restro/${cleanImage}`;
}

function minOrderValue(r: any) {
  const value = Number(
    r?.MinimumOrderValue ??
      r?.minimumOrderValue ??
      r?.MinOrder ??
      r?.MinimumOrder ??
      0
  );

  return Number.isFinite(value) && value > 0 ? value : 0;
}

function slugify(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .filter((v) => {
      const key = v.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function splitTerms(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(splitTerms);
  if (typeof value === "object") return Object.values(value).flatMap(splitTerms);

  return String(value)
    .split(/[,|;/\n\r]+/g)
    .map((v) => v.replace(/\s+/g, " ").trim())
    .filter((v) => v.length >= 2 && v.length <= 60);
}

function stationSlug(name: string, code: string) {
  const safeName = slugify(name || code);
  const safeCode = slugify(code);
  return `${safeName}-${safeCode}-food-delivery-in-train`;
}

function stationUrl(slug: string) {
  const cleanSlug = String(slug || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/^stations\//i, "");

  return `${siteUrl}/stations/${cleanSlug}`;
}

function absoluteImage(src: string) {
  if (!src) return `${siteUrl}${defaultImage}`;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return `${siteUrl}${src.startsWith("/") ? src : `/${src}`}`;
}

function normalizeAbsoluteUrl(value: string) {
  return String(value || "")
    .replace(/([^:]\/)\/+/g, "$1")
    .replace(/\/+$/g, "");
}

function numericValue(value: any) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function dateValue(value: any) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function restaurantName(row: any) {
  return String(row?.RestroName || row?.RestaurantName || "Restaurant").trim();
}

function restaurantHref(slug: string, row: any) {
  return `/stations/${slug}/${row.RestroCode}-${slugify(restaurantName(row))}`;
}

function sortRestaurants(restros: any[]) {
  return [...restros].sort((a, b) => {
    const ratingDiff = numericValue(b?.RestroRating) - numericValue(a?.RestroRating);
    if (ratingDiff) return ratingDiff;

    const activeDiff = Number(isActive(b?.RaileatsStatus)) - Number(isActive(a?.RaileatsStatus));
    if (activeDiff) return activeDiff;

    const newDiff =
      dateValue(b?.created_at || b?.CreatedAt || b?.UpdatedAt) -
      dateValue(a?.created_at || a?.CreatedAt || a?.UpdatedAt);
    if (newDiff) return newDiff;

    return restaurantName(a).localeCompare(restaurantName(b));
  });
}

function dedupeSchema(items: any[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key =
      item?.["@id"] ||
      `${item?.["@type"] || "Thing"}:${item?.name || item?.url || JSON.stringify(item).slice(0, 120)}`;

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function clampDescription(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= 160) return clean;
  return clean.slice(0, 157).replace(/\s+\S*$/, "") + "...";
}

function buildMetaDescription(stationName: string, code: string, restroCount = 0) {
  const restaurantText =
    restroCount > 0
      ? ` Choose from ${restroCount} trusted restaurant${restroCount === 1 ? "" : "s"}`
      : " Browse available restaurants";

  return clampDescription(
    `Order fresh food in train at ${stationName} Railway Station (${code}).${restaurantText} and get hygienic meals delivered to your seat.`
  );
}

function buildStationTitle(stationName: string, code: string) {
  const templates = [
    `Food Delivery at ${stationName} Railway Station (${code}) | ${siteName}`,
    `Order Food in Train at ${stationName} (${code}) | ${siteName}`,
    `Train Food Delivery at ${stationName} Railway Station | ${siteName}`,
    `Online Food Order at ${stationName} Station (${code}) | ${siteName}`,
    `Best Food Options at ${stationName} Railway Station | ${siteName}`,
  ];
  const seed = String(code || stationName)
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return templates[seed % templates.length];
}

function extractSeoTerms(restros: any[]) {
  const fields = [
    "Cuisine",
    "Cuisines",
    "CuisineType",
    "FoodType",
    "FoodTypes",
    "Category",
    "Categories",
    "Menu",
    "MenuItems",
    "Items",
    "ItemNames",
    "PopularItems",
    "Speciality",
    "Specialities",
    "Tags",
    "Keywords",
  ];

  const terms = restros.flatMap((r) =>
    fields.flatMap((field) => splitTerms(r?.[field]))
  );

  const derivedFromNames = restros
    .map((r) => r?.RestroName)
    .filter(Boolean)
    .map((name) => `${String(name).trim()} food`);

  return unique([...terms, ...derivedFromNames]).slice(0, 12);
}

function buildKeywords(stationName: string, code: string, seoTerms: string[]) {
  const station = stationName.toLowerCase();
  const stationCode = code.toLowerCase();
  const base = [
    `food on train ${station}`,
    `food delivery in train ${station}`,
    `order food in train ${station}`,
    `food at ${station} railway station`,
    `food delivery at ${station} junction`,
    `train food delivery ${station}`,
    `online food order ${station}`,
    `railway station food ${station}`,
    `IRCTC food delivery ${station}`,
    `food delivery at ${code}`,
    `food on train ${stationCode}`,
    `order food at ${stationCode} station`,
    "food delivery in train",
    "order food in train",
    "food on train",
    "train food delivery",
    "railway station food",
    "online food order",
    "IRCTC food delivery",
    "train seat food delivery",
    `${siteName} food delivery`,
  ];

  return unique([
    ...base,
    ...seoTerms.flatMap((term) => [
      `${term} in train ${station}`,
      `${term} delivery at ${station}`,
    ]),
  ]).slice(0, 30);
}

async function getStationNameByCode(code: string, fallback: string) {
  const { data } = await serviceClient
    .from("RestroMaster")
    .select("StationName")
    .eq("StationCode", code)
    .not("StationName", "is", null)
    .limit(1)
    .maybeSingle();

  return data?.StationName || fallback;
}

async function getRelatedStations(currentCode: string) {
  const { data } = await serviceClient
    .from("RestroMaster")
    .select("StationName, StationCode, RaileatsStatus, HolidayStatus")
    .neq("StationCode", currentCode)
    .not("StationCode", "is", null)
    .not("StationName", "is", null)
    .limit(200);

  const map = new Map<string, { name: string; code: string; slug: string }>();

  (data || []).forEach((row: any) => {
    if (!isActive(row.RaileatsStatus) || isHolidayOn(row.HolidayStatus)) return;

    const code = String(row.StationCode || "").trim().toUpperCase();
    const name = String(row.StationName || "").trim();
    if (!code || !name || map.has(code)) return;

    map.set(code, {
      name,
      code,
      slug: stationSlug(name, code),
    });
  });

  return Array.from(map.values()).slice(0, 8);
}

function buildFaqs({
  stationName,
  code,
  restroCount,
  seoTerms,
}: {
  stationName: string;
  code: string;
  restroCount: number;
  seoTerms: string[];
}) {
  const foodText =
    seoTerms.length > 0
      ? seoTerms.slice(0, 5).join(", ")
      : "fresh meals from active restaurants";

  return [
    {
      question: `Can I order food before reaching ${stationName}?`,
      answer: `Yes. Search by train, PNR or station on ${siteName}, choose ${stationName} (${code}), pick a restaurant and place the order before your train arrives.`,
    },
    {
      question: `How early should I place my food order at ${stationName}?`,
      answer: `It is better to order as early as possible after confirming your journey details. Restaurant choice and preparation time can vary by train arrival time.`,
    },
    {
      question: `What food options are available at ${stationName}?`,
      answer: `You may find options such as ${foodText}. The exact choice depends on restaurant timing, menu availability and service status for your journey.`,
    },
    {
      question: `Which restaurants serve train food at ${stationName}?`,
      answer: `${restroCount} restaurant${restroCount === 1 ? "" : "s"} are shown for ${stationName} when they are available for orders. Open a restaurant card to view its menu and minimum order value.`,
    },
    {
      question: `Can I order without a PNR?`,
      answer: `You can start with train or station details. If checkout asks for more journey information, enter accurate coach, berth and contact details for smooth seat delivery.`,
    },
    {
      question: `Will the food be delivered to my seat?`,
      answer: `Yes, seat delivery is the usual flow where service is available. Keep your coach, berth and phone number correct so the restaurant can coordinate at ${stationName}.`,
    },
    {
      question: `What payment methods are accepted?`,
      answer: `${siteName} supports online ordering, and available payment options are shown during checkout. Some restaurants may also support cash on delivery where enabled.`,
    },
    {
      question: `Can I order for someone else travelling through ${stationName}?`,
      answer: `Yes. Enter the traveller's correct train, coach, berth and contact details while placing the order so delivery can be handled properly.`,
    },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const stationBase = parseStationFromSlug(params.slug);
  const stationName =
    stationBase.isCodeOnly && stationBase.code
      ? await getStationNameByCode(stationBase.code, stationBase.name)
      : stationBase.name;

  const { data } = await serviceClient
    .from("RestroMaster")
    .select("*")
    .eq("StationCode", stationBase.code)
    .order("RestroRating", { ascending: false });

  const activeRestros = sortRestaurants((data || []).filter(
    (r: any) => isActive(r.RaileatsStatus) && !isHolidayOn(r.HolidayStatus)
  ));
  const seoTerms = extractSeoTerms(activeRestros);
  const title = buildStationTitle(stationName, stationBase.code);
  const description = buildMetaDescription(
    stationName,
    stationBase.code,
    activeRestros.length
  );
  const absoluteUrl = normalizeAbsoluteUrl(stationUrl(params.slug));
  const ogRestaurant = activeRestros.find((r: any) => restroImage(r) !== defaultImage);
  const ogImage = absoluteImage(ogRestaurant ? restroImage(ogRestaurant) : defaultImage);

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl,
    },
    keywords: buildKeywords(stationName, stationBase.code, seoTerms),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl,
      siteName,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: ogRestaurant
            ? `${restaurantName(ogRestaurant)} food at ${stationName}`
            : `${siteName} food ordering at ${stationName}`,
        },
      ],
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function Page({ params }: { params: { slug: string } }) {
  const stationBase = parseStationFromSlug(params.slug);
  const nowIso = new Date().toISOString();

  const { data: restrosRaw, error: restroError } = await serviceClient
    .from("RestroMaster")
    .select("*")
    .eq("StationCode", stationBase.code)
    .order("RestroRating", { ascending: false });

  const restros = restrosRaw || [];
  const stationName =
    restros?.[0]?.StationName || stationBase.name || stationBase.code;

  const restroCodes = restros
    .map((r: any) => Number(r.RestroCode))
    .filter(Boolean);

  const { data: holidaysRaw } =
    restroCodes.length > 0
      ? await serviceClient
          .from("RestroHolidays")
          .select("*")
          .in("RestroCode", restroCodes)
          .lte("start_at", nowIso)
          .gte("end_at", nowIso)
      : { data: [] as any[] };

  const holidaySet = new Set(
    (holidaysRaw || []).map((h: any) => Number(h.RestroCode))
  );

  const activeRestros = sortRestaurants(restros.filter((r: any) => {
    const active = isActive(r.RaileatsStatus);
    const holidayFromHolidayTable = holidaySet.has(Number(r.RestroCode));
    const holidayFromMaster = isHolidayOn(r.HolidayStatus);

    return active && !holidayFromHolidayTable && !holidayFromMaster;
  }));

  const seoTerms = extractSeoTerms(activeRestros);
  const relatedStations = await getRelatedStations(stationBase.code);
  const faqs = buildFaqs({
    stationName,
    code: stationBase.code,
    restroCount: activeRestros.length,
    seoTerms,
  });
  const absoluteUrl = normalizeAbsoluteUrl(stationUrl(params.slug));
  const topRestaurants = activeRestros
    .filter((r: any) => numericValue(r.RestroRating) > 0)
    .slice(0, 6);
  const recentRestaurants = [...activeRestros]
    .sort(
      (a: any, b: any) =>
        dateValue(b?.created_at || b?.CreatedAt || b?.UpdatedAt) -
        dateValue(a?.created_at || a?.CreatedAt || a?.UpdatedAt)
    )
    .slice(0, 6);

  const restaurantList = activeRestros.map((r: any, index: number) => {
    const restaurantName = String(r.RestroName || "Restaurant").trim();
    const restaurantUrl = normalizeAbsoluteUrl(`${siteUrl}${restaurantHref(params.slug, r)}`);

    return {
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Restaurant",
        "@id": `${restaurantUrl}#restaurant`,
        name: restaurantName,
        image: absoluteImage(restroImage(r)),
        url: restaurantUrl,
        servesCuisine: extractSeoTerms([r]),
        address: {
          "@type": "PostalAddress",
          addressLocality: stationName,
          addressCountry: "IN",
        },
        aggregateRating: r.RestroRating
          ? {
              "@type": "AggregateRating",
              ratingValue: String(r.RestroRating),
              bestRating: "5",
              worstRating: "1",
              ...(numericValue(r.ReviewCount || r.review_count || r.RatingCount)
                ? {
                    reviewCount: String(
                      numericValue(r.ReviewCount || r.review_count || r.RatingCount)
                    ),
                  }
                : {}),
            }
          : undefined,
      },
    };
  });

  const breadcrumbItems = [
    { name: "Home", href: "/" },
    { name: "Food on Train", href: "/" },
    { name: "Stations", href: "/stations" },
    { name: stationName, href: `/stations/${params.slug}` },
  ];

  const schema = dedupeSchema([
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${siteUrl}#organization`,
      name: siteName,
      url: siteUrl,
      logo: absoluteImage(defaultImage),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl}#website`,
      name: siteName,
      url: siteUrl,
      publisher: { "@id": `${siteUrl}#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbItems.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: `${siteUrl}${item.href === "/" ? "" : item.href}`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${absoluteUrl}#webpage`,
      name: `Food Delivery in Train at ${stationName} Junction Railway Station (${stationBase.code})`,
      url: absoluteUrl,
      description: buildMetaDescription(
        stationName,
        stationBase.code,
        activeRestros.length
      ),
      isPartOf: { "@id": `${siteUrl}#website` },
      provider: { "@id": `${siteUrl}#organization` },
      mainEntity: { "@id": `${absoluteUrl}#restaurants` },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${absoluteUrl}#restaurants`,
      name: `Active restaurants for Food Delivery in Train at ${stationName}`,
      itemListElement: restaurantList,
    },
    ...activeRestros.slice(0, 12).map((r: any) => {
      const restaurantName = String(r.RestroName || "Restaurant").trim();
      const restaurantUrl = normalizeAbsoluteUrl(`${siteUrl}${restaurantHref(params.slug, r)}`);

      return {
        "@context": "https://schema.org",
        "@type": "Restaurant",
        "@id": `${restaurantUrl}#restaurant`,
        name: restaurantName,
        image: absoluteImage(restroImage(r)),
        url: restaurantUrl,
        servesCuisine: extractSeoTerms([r]),
        address: {
          "@type": "PostalAddress",
          addressLocality: stationName,
          addressCountry: "IN",
        },
      };
    }),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${absoluteUrl}#collection`,
      name: `${stationName} food ordering options`,
      url: absoluteUrl,
      mainEntity: { "@id": `${absoluteUrl}#restaurants` },
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${absoluteUrl}#seat-delivery-service`,
      name: `Train food ordering at ${stationName}`,
      areaServed: `${stationName} Railway Station (${stationBase.code})`,
      provider: { "@id": `${siteUrl}#organization` },
    },
    ...activeRestros
      .filter((r: any) => restroImage(r) !== defaultImage)
      .slice(0, 8)
      .map((r: any, index: number) => ({
        "@context": "https://schema.org",
        "@type": "ImageObject",
        "@id": `${absoluteUrl}#restaurant-image-${index + 1}`,
        contentUrl: absoluteImage(restroImage(r)),
        name: `${restaurantName(r)} food at ${stationName}`,
        caption: `${restaurantName(r)} at ${stationName} Railway Station`,
      })),
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": `${absoluteUrl}#station-food-delivery`,
      name: `${siteName} Food Delivery at ${stationName} Railway Station`,
      url: absoluteUrl,
      image: absoluteImage(defaultImage),
      areaServed: {
        "@type": "Place",
        name: `${stationName} Railway Station (${stationBase.code})`,
      },
      provider: { "@id": `${siteUrl}#organization` },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${absoluteUrl}#faq`,
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <main className="mx-auto w-full max-w-[640px] px-2 pt-2 pb-28">
        <nav
          aria-label="Breadcrumb"
          className="mb-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-500 shadow-sm"
        >
          <ol className="flex flex-wrap items-center gap-1">
            {breadcrumbItems.map((item, index) => (
              <React.Fragment key={item.name}>
                <li>
                  {index === breadcrumbItems.length - 1 ? (
                    <span aria-current="page" className="text-slate-700">
                      {item.name}
                    </span>
                  ) : (
                    <Link href={item.href} className="text-orange-600">
                      {item.name}
                    </Link>
                  )}
                </li>
                {index < breadcrumbItems.length - 1 ? (
                  <li aria-hidden="true">/</li>
                ) : null}
              </React.Fragment>
            ))}
          </ol>
        </nav>

        <header className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
            {siteName} Station Food Delivery
          </p>

          <h1 className="text-[18px] font-black leading-snug tracking-[-0.2px] text-slate-900">
            Food Delivery in Train at {stationName} Junction Railway Station (
            {stationBase.code})
          </h1>

          <p className="mt-3 text-[13px] leading-6 text-slate-600">
            Order fresh meals for your journey at {stationName} Railway Station
            ({stationBase.code}) with {siteName}. Choose from{" "}
            {activeRestros.length} available restaurant
            {activeRestros.length === 1 ? "" : "s"}
            {seoTerms.length > 0 ? ` serving ${seoTerms.slice(0, 5).join(", ")}` : ""}
            , confirm your train details and get food delivered to your seat.
            It is a simple way to plan breakfast, lunch, dinner or snacks before
            your train reaches the station.
          </p>

          <Link
            href="/"
            className="mt-3 inline-block rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white shadow-sm"
            aria-label={`Search train and order food at ${stationName}`}
          >
            Search Train & Order Food
          </Link>
        </header>

        <section className="mt-5" aria-labelledby="active-restaurants">
          <h2
            id="active-restaurants"
            className="text-lg font-bold tracking-[-0.2px] text-slate-900"
          >
            Active Restaurants at {stationName}
          </h2>

          {restroError ? (
            <div className="mt-3 rounded-2xl border bg-white p-4 text-sm text-red-600 shadow-sm">
              Error loading restaurants: {restroError.message}
            </div>
          ) : activeRestros.length === 0 ? (
            <div className="mt-3 rounded-2xl border bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
              No active restaurants available right now at {stationName}. You
              can still search your train or nearby station to order food in
              train.
            </div>
          ) : (
            <div className="mt-3 grid gap-3">
              {activeRestros.map((r: any) => {
                const restaurantName = String(
                  r.RestroName || "Restaurant"
                ).trim();
                const href = `${restaurantHref(params.slug, r)}?mode=station`;

                return (
                  <article
                    key={r.RestroCode}
                    className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm"
                    aria-label={`${restaurantName} food delivery at ${stationName}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[16px] font-black leading-5 tracking-[-0.2px] text-slate-900">
                          {restaurantName}
                        </h3>

                        <p className="mt-2 text-[13px] font-bold leading-5 text-slate-600">
                          Min Order: Rs{" "}
                          {minOrderValue(r)}
                        </p>

                        <p className="mt-1.5 text-[12px] font-semibold leading-5 text-slate-500">
                          {stationName} ({stationBase.code})
                        </p>

                        <p className="mt-1.5 text-[12px] font-semibold text-slate-500">
                          Rating: {safeRating(r.RestroRating)}
                        </p>
                      </div>

                      <div className="flex w-[108px] shrink-0 flex-col items-center gap-2">
                        <div className="h-[86px] w-[86px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                          <Image
                            src={restroImage(r)}
                            unoptimized={restroImage(r).startsWith("http")}
                            alt={`${restaurantName} food for train travellers at ${stationName}`}
                            title={`${restaurantName} at ${stationName} Railway Station`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                            width={86}
                            height={86}
                          />
                        </div>

                        <Link
                          href={href}
                          className="w-full rounded-xl bg-orange-500 py-2 text-center text-xs font-black text-white shadow-sm"
                          aria-label={`Order food from ${restaurantName} at ${stationName}`}
                        >
                          Order Now
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {topRestaurants.length > 0 ? (
          <section className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold tracking-[-0.2px] text-slate-900">
              Best Rated Restaurants at {stationName}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {topRestaurants.map((r: any) => (
                <Link
                  key={`top-${r.RestroCode}`}
                  href={`${restaurantHref(params.slug, r)}?mode=station`}
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-orange-600"
                >
                  {restaurantName(r)}
                  {numericValue(r.RestroRating) > 0 ? ` · ${r.RestroRating}` : ""}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {recentRestaurants.length > 0 ? (
          <section className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold tracking-[-0.2px] text-slate-900">
              More Restaurants at {stationName}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {recentRestaurants.map((r: any) => (
                <Link
                  key={`recent-${r.RestroCode}`}
                  href={`${restaurantHref(params.slug, r)}?mode=station`}
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-orange-600"
                >
                  {restaurantName(r)}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold tracking-[-0.2px] text-slate-900">
            Station Overview
          </h2>
          <p className="mt-2 text-[13px] leading-6 text-slate-600">
            {stationName} Railway Station ({stationBase.code}) is an important
            stop for travellers who want a reliable meal without stepping out
            into platform rush. With {siteName}, you can check restaurants
            serving this station, compare menu choices and place an order that
            reaches your train seat during the scheduled halt.
          </p>
          <p className="mt-2 text-[13px] leading-6 text-slate-600">
            The restaurant selection here is built around convenience: fresh
            preparation, trusted food partners, secure ordering and delivery at
            your berth or seat.{" "}
            {seoTerms.length > 0
              ? `Current food choices include ${seoTerms.slice(0, 8).join(", ")}.`
              : "Food choices depend on restaurant availability and train timing."}
          </p>
        </section>

        <section className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold tracking-[-0.2px] text-slate-900">
            Popular Food at {stationName}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(seoTerms.length > 0
              ? seoTerms
              : activeRestros.map((r: any) => `${r.RestroName} food`)
            )
              .slice(0, 10)
              .map((term) => (
                <div
                  key={term}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-800"
                >
                  {term}
                </div>
              ))}
          </div>
        </section>

        <section className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold tracking-[-0.2px] text-slate-900">
            Why Choose {siteName}
          </h2>
          <div className="mt-3 grid gap-3">
            {[
              {
                title: `${activeRestros.length} restaurant${activeRestros.length === 1 ? "" : "s"} at ${stationName}`,
                copy: "Browse available partners before choosing what suits your journey.",
              },
              {
                title: "Fresh food for the train",
                copy: "Meals are prepared by restaurant partners and sent for seat delivery.",
              },
              {
                title: "Secure online ordering",
                copy: "Use train, PNR or station details and complete the order in a guided flow.",
              },
              {
                title: "Choice by cuisine",
                copy:
                  seoTerms.length > 0
                    ? `Popular choices include ${seoTerms.slice(0, 4).join(", ")}.`
                    : "Cuisine options appear according to restaurant availability.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 p-3">
                <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">
                  {item.copy}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold tracking-[-0.2px] text-slate-900">
            How to Order Food at {stationName}
          </h2>
          <ol className="mt-3 space-y-3">
            {[
              "Search your train or PNR",
              `Choose ${stationName} (${stationBase.code})`,
              `Select from ${activeRestros.length} active restaurant${activeRestros.length === 1 ? "" : "s"}`,
              "Place your food order online",
              "Receive food at your train seat",
            ].map((step, index) => (
              <li key={step} className="rounded-2xl border border-slate-200 p-3">
                <h3 className="text-sm font-black text-slate-900">
                  {index + 1}. {step}
                </h3>
              </li>
            ))}
          </ol>
        </section>

        {relatedStations.length > 0 ? (
          <section className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold tracking-[-0.2px] text-slate-900">
              Nearby Stations
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {relatedStations.map((station) => (
                <Link
                  key={station.code}
                  href={`/stations/${station.slug}`}
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-orange-600"
                >
                  Order Food at {station.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold tracking-[-0.2px] text-slate-900">
            More Ways to Order at {stationName}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              `Restaurants at ${stationName}`,
              `Order Food at ${stationName}`,
              ...seoTerms.slice(0, 6).map((term) => `${term} at ${stationName}`),
            ].map((text) => (
              <Link
                key={text}
                href={`/stations/${params.slug}`}
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-orange-600"
              >
                {text}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold tracking-[-0.2px] text-slate-900">
            Frequently Asked Questions
          </h2>

          <div className="mt-4 space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question}>
                <h3 className="text-sm font-semibold leading-5 text-slate-900">
                  {faq.question}
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

      </main>
    </>
  );
}

