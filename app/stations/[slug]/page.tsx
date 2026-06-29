import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { serviceClient } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const siteUrl = "https://www.raileats.in";
const siteName = "RailEats";
const defaultImage = "/raileats-logo.png";

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
  return (
    r?.RestroImage ||
    r?.restroImage ||
    r?.image ||
    r?.Image ||
    r?.photo ||
    r?.Photo ||
    r?.logo ||
    r?.Logo ||
    defaultImage
  );
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
  return `${siteUrl}/stations/${slug}`;
}

function absoluteImage(src: string) {
  return src.startsWith("http") ? src : `${siteUrl}${src}`;
}

function clampDescription(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= 160) return clean;
  return clean.slice(0, 157).replace(/\s+\S*$/, "") + "...";
}

function buildMetaDescription(stationName: string, code: string, restroCount = 0) {
  return clampDescription(
    `Food Delivery in Train at ${stationName} (${code}) Railway Station. Order Food in Train online with ${siteName} from ${restroCount} active restaurants.`
  );
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
      question: `How can I order food in train at ${stationName} Railway Station?`,
      answer: `Search your train, PNR or station on ${siteName}, choose from ${restroCount} active restaurant${restroCount === 1 ? "" : "s"} at ${stationName} (${code}), select food and confirm seat delivery.`,
    },
    {
      question: `Is Food Delivery in Train available at ${stationName} (${code})?`,
      answer: `${siteName} shows live restaurant availability for ${stationName}. Currently ${restroCount} active restaurant${restroCount === 1 ? "" : "s"} can appear for this station when service conditions match your journey.`,
    },
    {
      question: `What food can passengers order at ${stationName}?`,
      answer: `Food options at ${stationName} are generated from active restaurant data. Available choices may include ${foodText}, depending on menus, cuisines and restaurant status.`,
    },
    {
      question: `Which restaurants deliver at ${stationName} Railway Station?`,
      answer: `The restaurant list on this page is generated from current database records for ${stationName}. If a restaurant is added, renamed, removed, rated or marked inactive, the page updates automatically.`,
    },
    {
      question: `Can I order food at ${stationName} without changing my railway booking?`,
      answer: `Yes. ${siteName} is an online food ordering service for train passengers. Your train journey remains unchanged while you place a food order using train, PNR or station details.`,
    },
    {
      question: `Does ${siteName} support seat delivery at ${stationName}?`,
      answer: `${siteName} is built for train seat delivery where restaurant service is available. Use accurate train, coach and seat details so delivery can be coordinated at ${stationName}.`,
    },
    {
      question: `Can restaurant availability change at ${stationName}?`,
      answer: `Yes. Availability depends on live restaurant status, timings, holiday settings and station service. This page uses current data so passengers see the latest available options.`,
    },
    {
      question: `Why is ${siteName} useful for ${stationName} passengers?`,
      answer: `${siteName} helps passengers avoid platform rush by checking active restaurants, food choices and order options before the train reaches ${stationName} Railway Station.`,
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

  const activeRestros = (data || []).filter(
    (r: any) => isActive(r.RaileatsStatus) && !isHolidayOn(r.HolidayStatus)
  );
  const seoTerms = extractSeoTerms(activeRestros);
  const title = `Food Delivery in Train at ${stationName} Junction (${stationBase.code}) Railway Station | Order Food Online | ${siteName}`;
  const description = buildMetaDescription(
    stationName,
    stationBase.code,
    activeRestros.length
  );
  const absoluteUrl = stationUrl(params.slug);

  return {
    title,
    description,
    alternates: {
      canonical: `/stations/${params.slug}`,
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
          url: absoluteImage(defaultImage),
          width: 1200,
          height: 630,
          alt: `${siteName} Food Delivery in Train at ${stationName}`,
        },
      ],
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteImage(defaultImage)],
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

  const activeRestros = restros.filter((r: any) => {
    const active = isActive(r.RaileatsStatus);
    const holidayFromHolidayTable = holidaySet.has(Number(r.RestroCode));
    const holidayFromMaster = isHolidayOn(r.HolidayStatus);

    return active && !holidayFromHolidayTable && !holidayFromMaster;
  });

  const seoTerms = extractSeoTerms(activeRestros);
  const relatedStations = await getRelatedStations(stationBase.code);
  const faqs = buildFaqs({
    stationName,
    code: stationBase.code,
    restroCount: activeRestros.length,
    seoTerms,
  });
  const absoluteUrl = stationUrl(params.slug);

  const restaurantList = activeRestros.map((r: any, index: number) => {
    const restaurantName = String(r.RestroName || "Restaurant").trim();
    const restaurantUrl = `${siteUrl}/stations/${params.slug}/${
      r.RestroCode
    }-${slugify(restaurantName)}`;

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

  const schema = [
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
      const restaurantUrl = `${siteUrl}/stations/${params.slug}/${
        r.RestroCode
      }-${slugify(restaurantName)}`;

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
  ];

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
            {siteName} helps passengers order food in train at {stationName}{" "}
            Railway Station using live restaurant data for station code{" "}
            {stationBase.code}. This page currently reflects{" "}
            {activeRestros.length} active restaurant
            {activeRestros.length === 1 ? "" : "s"}
            {seoTerms.length > 0 ? ` and food options such as ${seoTerms.slice(0, 6).join(", ")}` : ""}
            . Travellers can search by train, PNR or station, choose from
            available restaurant partners and place an online food order for
            train seat delivery. Whenever the database changes, including
            restaurant status, rating, cuisine, menu, holiday settings or
            station details, Order fresh and hygienic food in train at LALITPUR JN. (LAR) from trusted restaurant partners. Search by train, PNR or station, choose your preferred restaurant and get food delivered directly to your seat.
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
                const href = `/stations/${params.slug}/${r.RestroCode}-${slugify(
                  restaurantName
                )}?mode=station`;

                return (
                  <article
                    key={r.RestroCode}
                    className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm"
                    aria-label={`${restaurantName} food delivery at ${stationName}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[16px] font-black leading-5 tracking-[-0.2px] text-slate-900">
                          🍴 {restaurantName} – Food Delivery in Train at{" "}
                          {stationName}
                        </h3>

                        <p className="mt-2 text-[13px] font-bold leading-5 text-slate-600">
                          Min Order: Rs{" "}
                          {Number(r.MinOrder || r.MinimumOrder || 0)}
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
                          <img
                            src={restroImage(r)}
                            alt={`Best Food Delivery in Train at ${stationName} - ${restaurantName}`}
                            title={`Food Delivery at ${stationName} Railway Station`}
                            className="h-full w-full object-cover"
                            loading="lazy"
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

        <section className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold tracking-[-0.2px] text-slate-900">
            About {stationName}
          </h2>
          <p className="mt-2 text-[13px] leading-6 text-slate-600">
            {stationName} Railway Station ({stationBase.code}) serves
            passengers looking for timely food delivery during their train
            journey. The information on this page is generated from current
            restaurant records, so it adapts when stations, restaurant names,
            ratings, cuisines, images, menus or active status change in the
            database. {siteName} keeps the ordering experience connected to live
            operational data instead of static SEO text.
          </p>
          <p className="mt-2 text-[13px] leading-6 text-slate-600">
            Passengers can use {siteName} to search by train, PNR or station,
            choose available restaurants at {stationName}, and order food for
            seat delivery where service is available. Current food signals for
            this station are{" "}
            {seoTerms.length > 0 ? seoTerms.join(", ") : "based on active restaurant data"}
            . These terms are derived from restaurant records, cuisines, menu
            fields and station availability, Available food options at LALITPUR JN. depend on active restaurants and their current menu, helping passengers choose from fresh meals available for delivery during their journey.
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
              `${activeRestros.length} active restaurant${activeRestros.length === 1 ? "" : "s"}`,
              `${seoTerms.length} food signal${seoTerms.length === 1 ? "" : "s"} from restaurant data`,
              `Station code ${stationBase.code}`,
              "Train seat delivery flow",
              "Live restaurant availability",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 p-3">
                <h3 className="text-sm font-bold text-slate-900">{item}</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">
                  This detail is generated from current station and restaurant
                  records for {stationName}.
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

        <section className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold tracking-[-0.2px] text-slate-900">
            Nearby Stations
          </h2>
          {relatedStations.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {relatedStations.map((station) => (
                <Link
                  key={station.code}
                  href={`/stations/${station.slug}`}
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-orange-600"
                >
                  Food Delivery at {station.name}
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[13px] leading-6 text-slate-600">
              Nearby station suggestions will appear automatically when active
              station records are available in the database.
            </p>
          )}
        </section>

        <section className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold tracking-[-0.2px] text-slate-900">
            Related Searches
          </h2>
          <div className="mt-3 grid gap-2">
            {buildKeywords(stationName, stationBase.code, seoTerms)
              .slice(0, 8)
              .map((text) => (
                <Link
                  key={text}
                  href={`/stations/${params.slug}`}
                  className="rounded-2xl border border-slate-200 p-3 text-sm font-bold text-slate-800"
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

        <footer className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500 shadow-sm">
          {siteName} dynamically updates this station page from live restaurant
          and station records for {stationName} ({stationBase.code}).
        </footer>
      </main>
    </>
  );
}
