// app/Stations/[slug]/page.tsx
import React from "react";
import type { Metadata } from "next";
import { redirect, permanentRedirect } from "next/navigation";
import { makeStationSlug, extractStationCode } from "../../lib/stationSlug";

/* ---------------- types ---------------- */
type Restro = {
  RestroCode: string | number;
  RestroName?: string;
  RestroRating?: number | null;
  isPureVeg?: boolean;
  RestroDisplayPhoto?: string | null;
  OpenTime?: string | null;
  ClosedTime?: string | null;
  MinimumOrdermValue?: number | null;
};

type StationResp = {
  station: {
    StationCode: string;
    StationName: string | null;
    State?: string | null;
    District?: string | null;
    image_url?: string | null;
  } | null;
  restaurants: Restro[];
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ---------------- helpers ---------------- */
function formatTimeShort(t?: string | null) {
  if (!t) return "—";
  const parts = String(t).split(":");
  if (parts.length < 2) return t;
  let hh = parseInt(parts[0], 10);
  const mm = parts[1];
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12;
  if (hh === 0) hh = 12;
  return `${hh}:${mm}${ampm}`;
}
function formatTimeRange(open?: string | null, close?: string | null) {
  if (!open && !close) return "—";
  return `${formatTimeShort(open)} to ${formatTimeShort(close)}`;
}

const ADMIN_BASE =
  process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

async function fetchStation(code: string): Promise<StationResp> {
  const url = `${ADMIN_BASE.replace(/\/$/, "")}/api/stations/${encodeURIComponent(
    code
  )}`;
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Failed to load station: ${resp.status} ${txt}`);
  }
  const json = (await resp.json()) as StationResp;
  return json;
}

/** Active holiday checker for one outlet (server-side) */
async function hasActiveHoliday(restroCode: string | number): Promise<boolean> {
  try {
    const url = `${ADMIN_BASE.replace(
      /\/$/,
      ""
    )}/api/restros/${encodeURIComponent(String(restroCode))}/holidays`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return false;

    const json = await res.json().catch(() => null);
    const rows: any[] =
      json?.rows ?? json?.data ?? json?.list ?? (Array.isArray(json) ? json : []);

    if (!Array.isArray(rows) || rows.length === 0) return false;

    const now = Date.now();
    for (const r of rows) {
      const deletedAt = r?.deleted_at ? Date.parse(r.deleted_at) : null;
      if (deletedAt) continue;

      const start = r?.start_at ? Date.parse(r.start_at) : NaN;
      const end = r?.end_at ? Date.parse(r.end_at) : NaN;
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;

      if (start <= now && now <= end) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Filter out outlets with an active holiday */
async function filterHolidayBlocked(restros: Restro[]): Promise<Restro[]> {
  if (!restros?.length) return [];
  const out: Restro[] = [];
  const window = 6;
  for (let i = 0; i < restros.length; i += window) {
    const slice = restros.slice(i, i + window);
    const results = await Promise.all(
      slice.map((r) => hasActiveHoliday(r.RestroCode))
    );
    slice.forEach((r, idx) => {
      if (!results[idx]) out.push(r);
    });
  }
  return out;
}

/* ---------------- SEO metadata ---------------- */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  // `slug` can be just "BPL" OR "BPL-bhopal-jn-food-delivery-in-train"
  const stationCode = extractStationCode(params.slug);
  try {
    const data = await fetchStation(stationCode);
    const name = data?.station?.StationName || stationCode;
    const state = data?.station?.State ? `, ${data.station.State}` : "";
    const title = `Food delivery in train at ${name} (${stationCode})${state} | RailEats`;
    const desc = `Order hot, hygienic food in train at ${name} (${stationCode}${state}) from verified restaurants. Veg & Non-Veg options, on-time delivery at your seat.`;

    const slug = makeStationSlug(stationCode, name);

    return {
      title,
      description: desc,
      alternates: {
        canonical: `/Stations/${slug}`,
      },
      openGraph: {
        title,
        description: desc,
        url: `/Stations/${slug}`,
        type: "website",
      },
    };
  } catch {
    return {
      title: `Food delivery in train | RailEats`,
      description:
        "Order hot, hygienic food in train from verified restaurants. Veg & Non-Veg options, on-time delivery at your seat.",
    };
  }
}

/* ---------------- page ---------------- */
export default async function Page({ params }: { params: { slug: string } }) {
  const raw = params.slug || "";
  const stationCode = extractStationCode(raw); // first token before '-'
  const code = stationCode.toUpperCase();

  // Load station
  let stationResp: StationResp | null = null;
  try {
    stationResp = await fetchStation(code);
  } catch (err: any) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-md shadow p-4">
          <h2 className="text-lg font-semibold">Station information unavailable</h2>
          <p className="mt-2 text-sm text-gray-600">
            We could not load details for station {code}. Please try again in a moment.
          </p>
          <pre className="mt-4 bg-yellow-50 p-3 rounded text-sm text-gray-700">
            {String(err.message)}
          </pre>
        </div>
      </main>
    );
  }

  // If the URL was only "/Stations/BPL" (no hyphenized name), redirect to SEO slug
  if (!raw.includes("-") && stationResp?.station?.StationName) {
    const seo = makeStationSlug(code, stationResp.station.StationName);
    try {
      permanentRedirect(`/Stations/${seo}`);
    } catch {
      redirect(`/Stations/${seo}`);
    }
  }

  const station = stationResp.station;

  // Filter-out active-holiday outlets
  const originalRestaurants = stationResp.restaurants ?? [];
  const restaurants = await filterHolidayBlocked(originalRestaurants);

  // Header line: "BPL — Bhopal Jn • Madhya Pradesh"
  const stationLine =
    station?.StationName && station?.State
      ? `${station.StationCode} — ${station.StationName} • ${station.State}`
      : station?.StationName
      ? `${station.StationCode} — ${station.StationName}`
      : code;

  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
      {/* Header with left square station image + right details */}
      <div className="mb-6">
        <div className="bg-gray-100 rounded-md p-4 flex flex-col sm:flex-row items-start gap-4">
          {/* left: square thumbnail */}
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded overflow-hidden flex-shrink-0 bg-white">
            {station?.image_url ? (
              <img
                src={station.image_url}
                alt={station?.StationName ?? station?.StationCode ?? code}
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                Station
              </div>
            )}
          </div>

          {/* right: text */}
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{stationLine}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {(station?.District ? station.District + " • " : "") + (station?.State ?? "")}
            </p>
            <div className="mt-3 text-sm text-gray-700">
              Restaurants & vendors delivering at this station.
            </div>
          </div>
        </div>
      </div>

      {/* Restaurants block */}
      <section className="mb-8">
        <div className="bg-white rounded-md shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-3">
            Restaurants at {station?.StationName ?? code}.
          </h2>

          {restaurants.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded text-sm text-gray-700">
              No active restaurants found for this station.
            </div>
          ) : (
            <div className="space-y-4">
              {restaurants.map((r) => (
                <article
                  key={String(r.RestroCode)}
                  className="flex flex-col md:flex-row items-stretch gap-3 p-3 sm:p-4 border rounded"
                >
                  {/* Square thumbnail (1:1) */}
                  <div className="flex-shrink-0 w-full md:w-36 lg:w-44 h-44 md:h-36 bg-gray-100 rounded overflow-hidden">
                    {r.RestroDisplayPhoto ? (
                      <img
                        src={r.RestroDisplayPhoto}
                        alt={r.RestroName ?? "Restaurant image"}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h3 className="text-lg sm:text-xl font-semibold leading-tight truncate">
                            {r.RestroName}
                          </h3>

                          <div className="mt-1 text-sm text-gray-600 flex items-center gap-3">
                            <span>Rating: {r.RestroRating ?? "—"}</span>
                            <span className="mx-1">•</span>

                            <span className="flex items-center gap-1">
                              {r.isPureVeg ? (
                                <span
                                  aria-hidden
                                  className="w-3 h-3 rounded bg-green-600 inline-block"
                                  title="Veg"
                                />
                              ) : (
                                <>
                                  <span
                                    className="w-3 h-3 rounded bg-red-600 inline-block"
                                    title="Non-Veg"
                                  />
                                  <span
                                    className="w-3 h-3 rounded bg-green-600 inline-block"
                                    title="Also serves Veg"
                                  />
                                </>
                              )}
                            </span>
                          </div>

                          <div className="mt-2 text-sm text-gray-700">
                            <strong>Multi Cuisines</strong>
                          </div>
                        </div>

                        <div className="ml-2 flex flex-col items-end gap-3">
                          <div className="text-xs text-gray-500">Min order</div>
                          <div className="font-medium text-base">
                            ₹{r.MinimumOrdermValue ?? "—"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="inline-block px-2 py-1 rounded bg-gray-100 text-sm text-gray-700">
                          {formatTimeRange(r.OpenTime, r.ClosedTime)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center">
                      <div className="ml-auto w-full md:w-auto">
                        <a
                          href={`/menu?restro=${encodeURIComponent(String(r.RestroCode))}`}
                          className="inline-block bg-green-600 text-white px-4 py-2 rounded text-sm w-full md:w-auto text-center"
                          aria-label={`Order now from ${r.RestroName}`}
                        >
                          Order Now
                        </a>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
