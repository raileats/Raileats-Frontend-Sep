import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { serviceClient } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";

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

function parseStationFromSlug(slug: string) {
  const clean = decodeURIComponent(slug || "")
    .replace(/-food-delivery$/i, "")
    .replace(/-food-delivery-in-train$/i, "");

  const parts = clean.split("-").filter(Boolean);
  const code = String(parts.pop() || "").toUpperCase();
  const name = titleCase(parts.join(" "));

  return {
    code,
    name: name || "Railway Station",
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

function isHolidayOff(value: any) {
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

export async function generateMetadata(props: {
  params: { slug: string };
}): Promise<Metadata> {
  const station = parseStationFromSlug(props.params.slug);

  return {
    title: `Food Delivery at ${station.name} (${station.code}) Railway Station`,
    description: `Order fresh food delivery in train at ${station.name} railway station. Choose active restaurants near ${station.code} station and get meals delivered to your train seat.`,
    alternates: {
      canonical: `/stations/${props.params.slug}`,
    },
    keywords: [
      `food delivery at ${station.name}`,
      `food delivery at ${station.code} station`,
      `order food in train at ${station.name}`,
      `${station.name} railway station food`,
      `train food delivery ${station.code}`,
      `food on train ${station.name}`,
    ],
    openGraph: {
      title: `Food Delivery at ${station.name} Railway Station | RailEats`,
      description: `Order fresh train food at ${station.name} (${station.code}) from active railway station restaurants.`,
      url: `${siteUrl}/stations/${props.params.slug}`,
      images: ["/raileats-logo.png"],
    },
  };
}

export default async function Page(props: {
  params: { slug: string };
  searchParams?: any;
}) {
  const resolvedParams = await Promise.resolve(props.params);
  const station = parseStationFromSlug(resolvedParams.slug);

  const nowIso = new Date().toISOString();

  const { data: restrosRaw, error: restroError } = await serviceClient
    .from("RestroMaster")
    .select("*")
    .eq("StationCode", station.code)
    .order("RestroRating", { ascending: false });

  const restros = restrosRaw || [];

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
    const holidayFromTable = holidaySet.has(Number(r.RestroCode));
    const holidayFromMaster = isHolidayOff(r.HolidayStatus);

    return active && !holidayFromTable && !holidayFromMaster;
  });

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Food Delivery at ${station.name} Railway Station`,
    url: `${siteUrl}/stations/${resolvedParams.slug}`,
    description: `Order food in train at ${station.name} railway station with RailEats.`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-3xl bg-gradient-to-br from-amber-100 via-orange-50 to-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-orange-600">
            RailEats Station Food Delivery
          </p>

          <h1 className="text-3xl font-extrabold leading-tight text-slate-900 md:text-5xl">
            Food Delivery at {station.name} ({station.code}) Railway Station
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
            Order fresh and hygienic food in train at {station.name} railway
            station. RailEats helps passengers choose active restaurants near{" "}
            {station.code} station and get meals delivered to their train seat.
          </p>

          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white"
          >
            Search Train & Order Food
          </Link>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Active Restaurants at {station.name}
          </h2>

          {restroError ? (
            <div className="mt-4 rounded-2xl border bg-white p-6 text-red-600">
              Error loading restaurants: {restroError.message}
            </div>
          ) : activeRestros.length === 0 ? (
            <div className="mt-4 rounded-2xl border bg-white p-6 text-slate-600">
              No active restaurants available right now at {station.name}.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {activeRestros.map((r: any) => (
                <div
                  key={r.RestroCode}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {r.RestroName}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {station.name} ({station.code})
                  </p>

                  <p className="mt-2 text-sm text-slate-600">
                    Rating: {safeRating(r.RestroRating)}
                  </p>

                  <Link
                    href={`/menu?restro=${r.RestroCode}&station=${station.code}`}
                    className="mt-4 inline-block rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white"
                  >
                    View Menu
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Order Food in Train at {station.name}
          </h2>

          <p className="mt-3 leading-7 text-slate-700">
            RailEats offers online food delivery in train at {station.name}{" "}
            ({station.code}) railway station. Passengers can search by train
            number, PNR or station, select available restaurants and place food
            orders for delivery at their train seat.
          </p>
        </section>
      </main>
    </>
  );
}
