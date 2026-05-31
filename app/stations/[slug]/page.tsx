import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { serviceClient } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const siteUrl = "https://www.raileats.in";

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

  return {
    title: `Food Delivery at ${stationName} (${stationBase.code}) Railway Station`,
    description: `Order fresh food delivery in train at ${stationName} railway station. Find active restaurants at ${stationBase.code} station and get food delivered to your train seat.`,
    alternates: {
      canonical: `/stations/${params.slug}`,
    },
    keywords: [
      `food delivery at ${stationName}`,
      `food delivery at ${stationBase.code} station`,
      `order food in train at ${stationName}`,
      `${stationName} railway station food`,
      `train food delivery ${stationBase.code}`,
      `food on train ${stationName}`,
      `online food order in train ${stationName}`,
    ],
    openGraph: {
      title: `Food Delivery at ${stationName} Railway Station | RailEats`,
      description: `Order fresh train food at ${stationName} (${stationBase.code}) from active railway station restaurants.`,
      url: `${siteUrl}/stations/${params.slug}`,
      images: ["/raileats-logo.png"],
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

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Food Delivery at ${stationName} Railway Station`,
    url: `${siteUrl}/stations/${params.slug}`,
    description: `Order food in train at ${stationName} railway station with RailEats.`,
    provider: {
      "@type": "Organization",
      name: "RailEats",
      url: siteUrl,
    },
    mainEntity: {
      "@type": "ItemList",
      name: `Active restaurants at ${stationName}`,
      itemListElement: activeRestros.map((r: any, index: number) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Restaurant",
          name: r.RestroName,
          url: `${siteUrl}/stations/${params.slug}/${r.RestroCode}-${String(
            r.RestroName || ""
          )
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")}`,
          aggregateRating: r.RestroRating
            ? {
                "@type": "AggregateRating",
                ratingValue: String(r.RestroRating),
                bestRating: "5",
              }
            : undefined,
        },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <main className="mx-auto max-w-[640px] px-2 py-4 pb-28 md:max-w-6xl md:px-4 md:py-8">
        <section className="rounded-[22px] border border-slate-200 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-4 shadow-sm md:p-6">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-orange-600 md:text-sm">
            RailEats Station Food Delivery
          </p>

          <h1 className="text-[22px] font-bold leading-tight tracking-[-0.3px] text-slate-900 md:text-5xl">
            Food Delivery at {stationName} ({stationBase.code}) Railway Station
          </h1>

          <p className="mt-3 max-w-3xl text-[13px] leading-6 text-slate-600 md:text-base md:leading-7">
            Order fresh and hygienic food in train at {stationName} railway
            station. RailEats helps passengers find active restaurants at{" "}
            {stationBase.code} station and get meals delivered to their train
            seat.
          </p>

          <Link
            href="/"
            className="mt-4 inline-block rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm md:mt-6 md:px-5 md:py-3 md:text-sm"
          >
            Search Train & Order Food
          </Link>
        </section>

        <section className="mt-5 md:mt-8">
          <h2 className="text-lg font-bold tracking-[-0.2px] text-slate-900 md:text-2xl">
            Active Restaurants at {stationName}
          </h2>

          {restroError ? (
            <div className="mt-3 rounded-2xl border bg-white p-4 text-sm text-red-600 shadow-sm md:p-6">
              Error loading restaurants: {restroError.message}
            </div>
          ) : activeRestros.length === 0 ? (
            <div className="mt-3 rounded-2xl border bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm md:p-6">
              No active restaurants available right now at {stationName}. You
              can still search your train or nearby station to order food in
              train.
            </div>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-3 md:gap-4">
              {activeRestros.map((r: any) => (
                <div
                  key={r.RestroCode}
                  className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <h3 className="text-[15px] font-bold leading-5 tracking-[-0.2px] text-slate-900 md:text-lg">
                    {r.RestroName}
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                    {stationName} ({stationBase.code})
                  </p>

                  <p className="mt-1.5 text-xs text-slate-600 md:text-sm">
                    Rating: {safeRating(r.RestroRating)}
                  </p>

                  <Link
                    href={`/stations/${params.slug}/${r.RestroCode}-${String(
                      r.RestroName || ""
                    )
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-+|-+$/g, "")}?mode=station`}
                    className="mt-3 inline-block rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-sm md:text-sm"
                  >
                    View Menu
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:mt-8 md:p-6">
          <h2 className="text-lg font-bold tracking-[-0.2px] text-slate-900 md:text-2xl">
            Order Food in Train at {stationName}
          </h2>

          <p className="mt-2 text-[13px] leading-6 text-slate-600 md:text-base md:leading-7">
            RailEats offers online food delivery in train at {stationName}{" "}
            ({stationBase.code}) railway station. Passengers can search by train
            number, PNR or station, select available restaurants and place food
            orders for delivery at their train seat.
          </p>

          <p className="mt-2 text-[13px] leading-6 text-slate-600 md:text-base md:leading-7">
            If you are travelling through {stationName}, RailEats helps you
            discover train food options including thalis, meals, biryani,
            snacks, beverages and restaurant specials depending on availability.
          </p>
        </section>

        <section className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:mt-8 md:p-6">
          <h2 className="text-lg font-bold tracking-[-0.2px] text-slate-900 md:text-2xl">
            Why choose RailEats at {stationName}?
          </h2>

          <div className="mt-3 grid gap-3 md:grid-cols-3 md:gap-4">
            <div className="rounded-2xl border border-slate-200 p-3 md:p-4">
              <h3 className="text-sm font-bold text-slate-900">
                Fresh Meals
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-600 md:text-sm md:leading-6">
                Order freshly prepared food from available restaurants near the
                railway station.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-3 md:p-4">
              <h3 className="text-sm font-bold text-slate-900">
                Train Seat Delivery
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-600 md:text-sm md:leading-6">
                Get your food delivered to your train seat at supported
                stations.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-3 md:p-4">
              <h3 className="text-sm font-bold text-slate-900">
                Easy Online Ordering
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-600 md:text-sm md:leading-6">
                Search by train, PNR or station and place your food order
                online.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:mt-10 md:p-6">
          <h2 className="text-lg font-bold tracking-[-0.2px] text-slate-900 md:text-2xl">
            Frequently Asked Questions
          </h2>

          <div className="mt-4 space-y-4 md:mt-6 md:space-y-5">
            <div>
              <h3 className="text-sm font-semibold leading-5 text-slate-900 md:text-lg">
                How can I order food in train at {stationName} station?
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-slate-600 md:text-base md:leading-7">
                Enter your train number or search by station, choose an active
                restaurant at {stationName} railway station, select food items
                and place your order online with RailEats.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold leading-5 text-slate-900 md:text-lg">
                Is food delivery available at {stationName} railway station?
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-slate-600 md:text-base md:leading-7">
                Yes, RailEats provides fresh food delivery in train at{" "}
                {stationName} station from trusted and active restaurants.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold leading-5 text-slate-900 md:text-lg">
                Can I order food without PNR at {stationName} station?
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-slate-600 md:text-base md:leading-7">
                Yes, passengers can order food in train using train number or by
                selecting the station directly without entering PNR details.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold leading-5 text-slate-900 md:text-lg">
                Which restaurants deliver food at {stationName} railway station?
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-slate-600 md:text-base md:leading-7">
                RailEats shows active restaurants available for food delivery at{" "}
                {stationName} station based on restaurant timings and
                availability.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
