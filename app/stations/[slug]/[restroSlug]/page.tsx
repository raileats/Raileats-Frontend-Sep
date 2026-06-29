import type { Metadata } from "next";
import Link from "next/link";
import { extractRestroCode } from "../../../lib/restroSlug";
import { serviceClient } from "../../../lib/supabaseServer";
import RestroMenuClient from "./RestroMenuClient";

export const revalidate = 60;
export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.raileats.in";
const SITE_NAME = "RailEats";
const DEFAULT_IMAGE = "/raileats-logo.png";

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

function parseStationInfo(slugRaw: string, fallbackCode: string) {
  const raw = decodeURIComponent(String(slugRaw || "")).trim();

  const isSeoFoodDeliveryUrl =
    /-food-delivery-in-train$/i.test(raw) || /-food-delivery$/i.test(raw);

  const clean = raw
    .replace(/-food-delivery-in-train$/i, "")
    .replace(/-food-delivery$/i, "");

  const parts = clean.split("-").filter(Boolean);

  let code = String(fallbackCode || "").toUpperCase();
  let nameParts = parts;

  if (!isSeoFoodDeliveryUrl && parts.length > 1) {
    code = parts[0].toUpperCase();
    nameParts = parts.slice(1);
  } else if (isSeoFoodDeliveryUrl && parts.length > 1) {
    code = parts[parts.length - 1].toUpperCase();
    nameParts = parts.slice(0, -1);
  }

  const name = titleCase(nameParts.join(" "));

  return { code, name };
}

function buildCanonical(params: any) {
  const path = `/stations/${encodeURIComponent(
    params.slug || ""
  )}/${encodeURIComponent(params.restroSlug || "")}`;

  return normalizeAbsoluteUrl(`${SITE_URL}${path}`);
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

function absoluteImage(src?: string) {
  const image = src || DEFAULT_IMAGE;
  return image.startsWith("http") ? image : `${SITE_URL}${image}`;
}

function normalizeAbsoluteUrl(value: string) {
  return String(value || "")
    .replace(/([^:]\/)\/+/g, "$1")
    .replace(/\/+$/g, "");
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

function restaurantName(row: any) {
  return String(row?.RestroName || row?.RestaurantName || "Restaurant").trim();
}

function restaurantHref(stationSlug: string, row: any) {
  return `/stations/${stationSlug}/${row.RestroCode}-${slugify(restaurantName(row))}`;
}

function rowImage(row: any) {
  return (
    row?.RestroImage ||
    row?.restroImage ||
    row?.image ||
    row?.Image ||
    row?.photo ||
    row?.Photo ||
    row?.logo ||
    row?.Logo ||
    ""
  );
}

function sortRestaurants(restros: any[]) {
  return [...restros].sort((a, b) => {
    const ratingDiff =
      Number(b?.RestroRating || b?.rating || 0) - Number(a?.RestroRating || a?.rating || 0);
    if (ratingDiff) return ratingDiff;

    const activeDiff = Number(isActive(b?.RaileatsStatus)) - Number(isActive(a?.RaileatsStatus));
    if (activeDiff) return activeDiff;

    return restaurantName(a).localeCompare(restaurantName(b));
  });
}

function clampDescription(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= 160) return clean;
  return clean.slice(0, 157).replace(/\s+\S*$/, "") + "...";
}

function splitTerms(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(splitTerms);
  if (typeof value === "object") return Object.values(value).flatMap(splitTerms);

  return String(value)
    .split(/[,|;/\n\r]+/g)
    .map((v) => v.replace(/\s+/g, " ").trim())
    .filter((v) => v.length >= 2 && v.length <= 70);
}

function positiveNumber(value: any) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function firstPositiveNumber(source: any, keys: string[]) {
  for (const key of keys) {
    const value = positiveNumber(source?.[key]);
    if (value !== null) return value;
  }

  return null;
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

async function fetchStationRestaurants(stationCode: string, currentRestroCode: string) {
  if (!stationCode) return [];

  const { data } = await serviceClient
    .from("RestroMaster")
    .select("*")
    .eq("StationCode", stationCode)
    .limit(100);

  return sortRestaurants(
    (data || []).filter((row: any) => {
      const code = String(row?.RestroCode || "");
      return (
        code &&
        code !== String(currentRestroCode || "") &&
        isActive(row?.RaileatsStatus) &&
        !isHolidayOn(row?.HolidayStatus)
      );
    })
  );
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
  const itemName = it?.item_name || it?.ItemName || it?.name || "";

  return {
    id: Number(it?.id ?? it?.item_code ?? it?.ItemCode ?? it?.ItemId ?? 0),

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

    item_category: normalizeCategory(it?.item_category ?? it?.ItemCategory, itemName),

    menu_type:
      it?.menu_type || it?.MenuType || it?.item_type || it?.category || "Meals",

    item_description:
      it?.item_description || it?.ItemDescription || it?.description || "",

    start_time: it?.start_time || it?.StartTime || it?.item_start_time || null,

    end_time: it?.end_time || it?.EndTime || it?.item_end_time || null,

    status: normalizeStatus(
      it?.status ?? it?.Status ?? it?.item_status ?? it?.ItemStatus
    ),

    item_cuisine: it?.item_cuisine || it?.ItemCuisine || it?.cuisine || null,

    menu_item_image:
      it?.menu_item_image ||
      it?.MenuItemImage ||
      it?.item_image ||
      it?.ItemImage ||
      it?.image ||
      it?.Image ||
      "",
  };
}

function normalizeItems(rawItems: any[], arrivalTime: string) {
  return (rawItems || [])
    .map(normalizeItem)
    .filter((it: any) => {
      if (!it.id || !it.item_name) return false;
      if (it.status !== "ON") return false;

      return isTimeInRange(arrivalTime, it.start_time, it.end_time);
    });
}

/* ================= SEO CONTENT ================= */

function extractMenuTerms(items: any[]) {
  const cuisineTerms = items.flatMap((it) => splitTerms(it.item_cuisine));
  const typeTerms = items.flatMap((it) => splitTerms(it.menu_type));
  const categoryTerms = items.flatMap((it) => splitTerms(it.item_category));
  const itemTerms = items.map((it) => String(it.item_name || "").trim());

  return unique([...cuisineTerms, ...typeTerms, ...categoryTerms, ...itemTerms]).slice(
    0,
    40
  );
}

function buildDescription({
  outletName,
  stationName,
  stationCode,
  itemCount,
  terms,
}: {
  outletName: string;
  stationName: string;
  stationCode: string;
  itemCount: number;
  terms: string[];
}) {
  const foodText = terms.length ? ` including ${terms.slice(0, 3).join(", ")}` : "";
  return clampDescription(
    `Order fresh food from ${outletName} at ${stationName} Railway Station (${stationCode}). Browse ${itemCount} menu item${itemCount === 1 ? "" : "s"}${foodText} for seat delivery.`
  );
}

function buildKeywords({
  outletName,
  stationName,
  stationCode,
  trainNumber,
  terms,
}: {
  outletName: string;
  stationName: string;
  stationCode: string;
  trainNumber: string;
  terms: string[];
}) {
  const restaurant = outletName.toLowerCase();
  const station = stationName.toLowerCase();
  const code = stationCode.toLowerCase();

  return unique([
    `${restaurant} menu`,
    `${restaurant} food delivery`,
    `${restaurant} train food`,
    `${restaurant} ${station}`,
    `${restaurant} ${code}`,
    `order food from ${restaurant}`,
    `food delivery at ${station}`,
    `food delivery in train at ${station}`,
    `order food in train at ${station}`,
    `food on train ${station}`,
    `train food delivery ${station}`,
    `railway station food ${station}`,
    `online food order ${station}`,
    `IRCTC food delivery ${station}`,
    `food delivery at ${stationCode}`,
    `order food at ${stationCode}`,
    trainNumber ? `food in train ${trainNumber}` : "",
    trainNumber ? `${restaurant} train ${trainNumber}` : "",
    `${SITE_NAME}`,
    `${SITE_NAME} ${restaurant}`,
    `${SITE_NAME} ${station}`,
    ...terms.flatMap((term) => [
      `${term} at ${restaurant}`,
      `${term} in train`,
      `${term} delivery at ${station}`,
      `${term} ${stationCode}`,
      `${restaurant} ${term}`,
    ]),
  ]).slice(0, 60);
}

function buildFaqs({
  outletName,
  stationName,
  stationCode,
  itemCount,
  terms,
  minimumOrder,
}: {
  outletName: string;
  stationName: string;
  stationCode: string;
  itemCount: number;
  terms: string[];
  minimumOrder: number;
}) {
  const foodText = terms.length ? terms.slice(0, 6).join(", ") : "available menu items";

  return [
    {
      question: `Can I order food from ${outletName} before my train reaches ${stationName}?`,
      answer: `Yes. Open the menu, choose your items and continue with your train details so the order can be prepared for the halt at ${stationName} (${stationCode}).`,
    },
    {
      question: `What can I order from ${outletName}?`,
      answer: `${outletName} offers ${foodText}. Final availability can depend on restaurant timing, preparation window and the selected arrival time.`,
    },
    {
      question: `Does ${outletName} deliver to train seats at ${stationName}?`,
      answer: `Seat delivery is supported where service is available. Enter accurate coach, berth and phone details so the delivery can be coordinated smoothly.`,
    },
    {
      question: `What is the minimum order value at ${outletName}?`,
      answer: minimumOrder > 0
        ? `${outletName} currently shows a minimum order value of Rs ${minimumOrder}. Check the cart before checkout for the final payable amount.`
        : `Minimum order details are shown during menu selection and checkout for ${outletName}.`,
    },
    {
      question: `Can I pay online for ${outletName} orders?`,
      answer: `Payment options are shown during checkout on ${SITE_NAME}. Choose the method available for your train food order before confirming.`,
    },
    {
      question: `Can I order ${outletName} food for someone else?`,
      answer: `Yes. Use the traveller's train, coach, berth and contact details so the restaurant can deliver the order at ${stationName}.`,
    },
  ];
}

/* ================= SEO ================= */

export async function generateMetadata({
  params,
  searchParams,
}: any): Promise<Metadata> {
  const parsedStation = parseStationInfo(params.slug, "");
  const stationCode = parsedStation.code;
  const stationName = parsedStation.name;
  const restroCode = extractRestroCode(params.restroSlug) || "";
  const outletName = humanizeFromSlug(params.restroSlug);

  const deliveryTime =
    firstParam(searchParams?.deliveryTime) ||
    firstParam(searchParams?.arrival)?.slice(0, 5) ||
    firstParam(searchParams?.arrivalTime)?.slice(0, 5) ||
    "";

  const trainNumber = firstParam(searchParams?.train) || "";
  const arrivalTime = deliveryTime ? `${deliveryTime.slice(0, 5)}:00` : "12:00:00";
  const rawItems = await fetchOnMenu(restroCode, arrivalTime);
  const items = normalizeItems(rawItems, arrivalTime);
  const terms = extractMenuTerms(items);
  const title = `Order Food from ${outletName} at ${stationName} Railway Station | ${SITE_NAME}`;
  const description = buildDescription({
    outletName,
    stationName,
    stationCode,
    itemCount: items.length,
    terms,
  });
  const canonical = buildCanonical(params);
  const image = absoluteImage(
    items.find((it: any) => it.menu_item_image)?.menu_item_image || DEFAULT_IMAGE
  );

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
      siteName: SITE_NAME,
      type: "website",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${outletName} food delivery at ${stationName}`,
        },
      ],
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    keywords: buildKeywords({
      outletName,
      stationName,
      stationCode,
      trainNumber,
      terms,
    }),
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
  };
}

/* ================= PAGE ================= */

export default async function Page({ params, searchParams }: any) {
  const parsedStation = parseStationInfo(params.slug, "");
  const stationCode = parsedStation.code;
  const stationName = parsedStation.name;
  const restroCode = extractRestroCode(params.restroSlug) || "";
  const outletName = humanizeFromSlug(params.restroSlug);

  const deliveryDate =
    firstParam(searchParams?.deliveryDate) || firstParam(searchParams?.date) || "";

  const deliveryTime =
    firstParam(searchParams?.deliveryTime) ||
    firstParam(searchParams?.arrival)?.slice(0, 5) ||
    firstParam(searchParams?.arrivalTime)?.slice(0, 5) ||
    "";

  const trainNameRaw = firstParam(searchParams?.trainName);
  const trainName = trainNameRaw && trainNameRaw !== "Train" ? trainNameRaw : "";
  const trainNumber = firstParam(searchParams?.train) || "";
  const minOrderFromUrl = firstParam(searchParams?.minOrder) || "0";

  const arrivalTime = deliveryTime ? `${deliveryTime.slice(0, 5)}:00` : "12:00:00";
  const rawItems = await fetchOnMenu(restroCode, arrivalTime);
  const stationRestaurants = await fetchStationRestaurants(stationCode, String(restroCode));

  const items = normalizeItems(rawItems, arrivalTime);
  const terms = extractMenuTerms(items);
  const canonical = buildCanonical(params);
  const minimumOrder = Number(minOrderFromUrl || 0);
  const sameStationRestaurants = stationRestaurants.slice(0, 8);
  const similarCuisineRestaurants = stationRestaurants
    .filter((row: any) => {
      const rowTerms = splitTerms([
        row.Cuisine,
        row.Cuisines,
        row.CuisineType,
        row.FoodType,
        row.FoodTypes,
        row.Category,
        row.Categories,
      ]).map((term) => term.toLowerCase());

      return terms.some((term) => rowTerms.includes(term.toLowerCase()));
    })
    .slice(0, 8);
  const ratedRestaurants = stationRestaurants
    .filter((row: any) => positiveNumber(row.RestroRating || row.rating))
    .slice(0, 8);
  const faqs = buildFaqs({
    outletName,
    stationName,
    stationCode,
    itemCount: items.length,
    terms,
    minimumOrder,
  });

  const header = {
    stationCode,
    restroCode: String(restroCode),
    outletName,
    stationName,
    minimumOrder,
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

  const menuSections = Array.from(
    new Set(items.map((it: any) => it.menu_type).filter(Boolean))
  );

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${canonical}#menu-items`,
    name: `${outletName} menu items at ${stationName}`,
    itemListElement: items.slice(0, 100).map((it: any, index: number) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "MenuItem",
        name: it.item_name,
        description: it.item_description || undefined,
        image: it.menu_item_image ? absoluteImage(it.menu_item_image) : undefined,
        offers: {
          "@type": "Offer",
          price: it.base_price,
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
        },
      },
    })),
  };

  const firstRestaurantRow = rawItems.find(Boolean) || {};
  const ratingValue =
    firstPositiveNumber(firstRestaurantRow, [
      "rating",
      "Rating",
      "restro_rating",
      "RestroRating",
      "restaurant_rating",
      "RestaurantRating",
      "avg_rating",
      "AvgRating",
    ]) ||
    firstPositiveNumber(searchParams, [
      "rating",
      "restroRating",
      "restaurantRating",
      "avgRating",
    ]);
  const reviewCount =
    firstPositiveNumber(firstRestaurantRow, [
      "review_count",
      "ReviewCount",
      "reviews_count",
      "ReviewsCount",
      "rating_count",
      "RatingCount",
    ]) ||
    firstPositiveNumber(searchParams, ["reviewCount", "reviewsCount", "ratingCount"]);
  const aggregateRating = ratingValue
    ? {
        "@type": "AggregateRating",
        ratingValue: String(ratingValue),
        bestRating: "5",
        worstRating: "1",
        ...(reviewCount ? { reviewCount: String(reviewCount) } : {}),
      }
    : undefined;

  const restaurantSchema = {
    "@context": "https://schema.org",
    "@type": ["Restaurant", "LocalBusiness", "FoodEstablishment"],
    "@id": `${canonical}#restaurant`,
    name: outletName,
    url: canonical,
    image: absoluteImage(
      items.find((it: any) => it.menu_item_image)?.menu_item_image || DEFAULT_IMAGE
    ),
    servesCuisine: unique(items.map((it: any) => it.item_cuisine).filter(Boolean)),
    aggregateRating,
    menu: {
      "@type": "Menu",
      "@id": `${canonical}#menu`,
      name: `${outletName} Menu`,
      hasMenuSection: menuSections.map((section) => ({
        "@type": "MenuSection",
        name: section,
        hasMenuItem: items
          .filter((it: any) => it.menu_type === section)
          .slice(0, 30)
          .map((it: any) => ({
            "@type": "MenuItem",
            name: it.item_name,
            description: it.item_description || undefined,
            image: it.menu_item_image ? absoluteImage(it.menu_item_image) : undefined,
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

  const breadcrumbItems = [
    { name: "Home", href: SITE_URL },
    { name: "Food on Train", href: SITE_URL },
    {
      name: stationName,
      href: `${SITE_URL}/stations/${encodeURIComponent(params.slug || "")}`,
    },
    { name: outletName, href: canonical },
  ];

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.href,
    })),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${canonical}#faq`,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const imageSchema = items
    .filter((it: any) => it.menu_item_image)
    .slice(0, 12)
    .map((it: any) => ({
      "@context": "https://schema.org",
      "@type": "ImageObject",
      contentUrl: absoluteImage(it.menu_item_image),
      name: `${it.item_name} from ${outletName}`,
      caption: `${it.item_name} delivery at ${stationName}`,
    }));

  const offerCatalogSchema = {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    "@id": `${canonical}#offers`,
    name: `${outletName} food offers at ${stationName}`,
    itemListElement: items.slice(0, 100).map((it: any) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "MenuItem",
        name: it.item_name,
      },
      price: it.base_price,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    })),
  };

  const relatedRestaurantSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${canonical}#related-restaurants`,
    name: `More restaurants at ${stationName}`,
    itemListElement: sameStationRestaurants.map((row: any, index: number) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Restaurant",
        "@id": `${normalizeAbsoluteUrl(`${SITE_URL}${restaurantHref(params.slug, row)}`)}#restaurant`,
        name: restaurantName(row),
        url: normalizeAbsoluteUrl(`${SITE_URL}${restaurantHref(params.slug, row)}`),
        image: rowImage(row) ? absoluteImage(rowImage(row)) : undefined,
      },
    })),
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    name: `Order Food from ${outletName} at ${stationName} Railway Station`,
    url: canonical,
    description: buildDescription({
      outletName,
      stationName,
      stationCode,
      itemCount: items.length,
      terms,
    }),
    mainEntity: {
      "@id": `${canonical}#restaurant`,
    },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteImage(DEFAULT_IMAGE),
  };

  const searchActionSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: {
      "@id": `${SITE_URL}#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const collectionPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonical}#collection`,
    name: `${outletName} menu and restaurants at ${stationName}`,
    url: canonical,
    mainEntity: {
      "@id": `${canonical}#restaurant`,
    },
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${canonical}#seat-delivery-service`,
    name: `Train food ordering from ${outletName}`,
    areaServed: `${stationName} Railway Station (${stationCode})`,
    provider: {
      "@id": `${SITE_URL}#organization`,
    },
  };

  const schema = [
    organizationSchema,
    searchActionSchema,
    collectionPageSchema,
    serviceSchema,
    webPageSchema,
    restaurantSchema,
    itemListSchema,
    offerCatalogSchema,
    ...(sameStationRestaurants.length > 0 ? [relatedRestaurantSchema] : []),
    breadcrumbSchema,
    faqSchema,
    ...imageSchema,
  ];

  return (
    <main className="w-full">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <nav
        aria-label="Breadcrumb"
        className="mx-auto mt-4 max-w-[560px] px-4 text-sm font-semibold text-slate-600"
      >
        <ol className="flex flex-wrap gap-2">
          {breadcrumbItems.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex items-center gap-2">
              {index < breadcrumbItems.length - 1 ? (
                <Link
                  href={item.href.replace(SITE_URL, "") || "/"}
                  className="text-orange-600"
                >
                  {item.name}
                </Link>
              ) : (
                <span aria-current="page">{item.name}</span>
              )}
              {index < breadcrumbItems.length - 1 ? (
                <span aria-hidden="true">/</span>
              ) : null}
            </li>
          ))}
        </ol>
      </nav>

      <RestroMenuClient header={header} items={items} nextParams={nextParams} />

      <section className="mx-auto mt-10 max-w-[560px] rounded-3xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Order Food from {outletName} at {stationName} Railway Station
        </h1>

        <p className="mt-3 leading-7 text-slate-700">
          {outletName} serves train travellers ordering food at {stationName}{" "}
          ({stationCode}). Browse the menu before your train reaches the
          station, choose from {items.length} available item
          {items.length === 1 ? "" : "s"}
          {terms.length > 0 ? ` such as ${terms.slice(0, 6).join(", ")}` : ""},
          and continue with your train, coach and seat details for delivery
          during the halt.
        </p>
      </section>

      {items.length > 0 ? (
        <section className="mx-auto mt-6 max-w-[560px] rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">
            Popular Menu from {outletName}
          </h2>

          <div className="mt-5 grid gap-3">
            {items.slice(0, 12).map((it: any) => (
              <article
                key={it.id}
                className="rounded-2xl border border-slate-200 p-4"
                aria-label={`${it.item_name} from ${outletName}`}
              >
                <div className="flex gap-3">
                  {it.menu_item_image ? (
                    <img
                      src={it.menu_item_image}
                      alt={`${it.item_name} from ${outletName} at ${stationName}`}
                      title={`${it.item_name} train food delivery at ${stationName}`}
                      width={84}
                      height={84}
                      loading="lazy"
                      decoding="async"
                      className="h-[84px] w-[84px] rounded-xl object-cover"
                    />
                  ) : null}

                  <div>
                    <h3 className="font-bold text-slate-900">{it.item_name}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {it.menu_type} {it.item_cuisine ? `• ${it.item_cuisine}` : ""}
                    </p>
                    {it.item_description ? (
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {it.item_description}
                      </p>
                    ) : null}
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      Rs {it.base_price}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto mt-6 max-w-[560px] rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">
          About {outletName}
        </h2>

        <p className="mt-3 leading-7 text-slate-700">
          {outletName} is available for food ordering at {stationName} Railway
          Station. The menu is useful for planning a meal around your train
          timing, especially when you want fresh food delivered to your seat
          instead of searching on the platform.
        </p>

        {terms.length > 0 ? (
          <p className="mt-3 leading-7 text-slate-700">
            Popular choices from this restaurant include{" "}
            {terms.slice(0, 8).join(", ")}. Select your items, review the cart
            and continue through checkout with accurate journey details.
          </p>
        ) : null}

        {minimumOrder > 0 ? (
          <p className="mt-3 leading-7 text-slate-700">
            Minimum order value shown for {outletName}: Rs {minimumOrder}.
          </p>
        ) : null}
      </section>

      <section className="mx-auto mt-6 max-w-[560px] rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">
          Why Order Here
        </h2>

        <div className="mt-4 grid gap-3">
          {[
            "Fresh food prepared by the restaurant",
            "Seat delivery for train travellers",
            "Online ordering with clear menu prices",
            terms.length > 0
              ? `Cuisine choices: ${terms.slice(0, 4).join(", ")}`
              : "",
          ]
            .filter(Boolean)
            .map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-bold text-slate-900">{item}</h3>
              </div>
            ))}
        </div>
      </section>

      {similarCuisineRestaurants.length > 0 ? (
        <section className="mx-auto mt-6 max-w-[560px] rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">
            Similar Cuisine Restaurants
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {similarCuisineRestaurants.map((row: any) => (
              <Link
                key={`similar-${row.RestroCode}`}
                href={`${restaurantHref(params.slug, row)}?mode=station`}
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-orange-600"
              >
                {restaurantName(row)}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {ratedRestaurants.length > 0 ? (
        <section className="mx-auto mt-6 max-w-[560px] rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">
            More Restaurants by Rating
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {ratedRestaurants.map((row: any) => (
              <Link
                key={`rated-${row.RestroCode}`}
                href={`${restaurantHref(params.slug, row)}?mode=station`}
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-orange-600"
              >
                {restaurantName(row)}
                {positiveNumber(row.RestroRating || row.rating)
                  ? ` · ${row.RestroRating || row.rating}`
                  : ""}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {sameStationRestaurants.length > 0 ? (
        <section className="mx-auto mt-6 max-w-[560px] rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">
            Other Restaurants at {stationName}
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {sameStationRestaurants.map((row: any) => (
              <Link
                key={`same-${row.RestroCode}`}
                href={`${restaurantHref(params.slug, row)}?mode=station`}
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-orange-600"
              >
                {restaurantName(row)}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto mt-6 max-w-[560px] rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">
          Back to {stationName}
        </h2>

        <Link
          href={`/stations/${params.slug}`}
          className="mt-4 inline-block rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-orange-600"
        >
          View all restaurants at {stationName}
        </Link>
      </section>

      <section className="mx-auto mt-6 max-w-[560px] rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">
          Frequently Asked Questions
        </h2>

        <div className="mt-6 space-y-5">
          {faqs.map((faq) => (
            <div key={faq.question}>
              <h3 className="text-lg font-semibold text-slate-900">
                {faq.question}
              </h3>
              <p className="mt-2 leading-7 text-slate-700">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-[560px] rounded-3xl border bg-orange-50 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Want to order food in train?
        </h2>

        <p className="mt-2 leading-7 text-slate-700">
          Search your train number, PNR or station on {SITE_NAME} to place an
          online food order for delivery at your train seat.
        </p>

        <a
          href="/"
          className="mt-4 inline-block rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white"
          aria-label="Search train and order food on RailEats"
        >
          Search Train & Order Food
        </a>
      </section>
    </main>
  );
}
