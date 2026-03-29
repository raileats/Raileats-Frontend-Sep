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
  open_time?: string | null;   // ✅ FIXED
  closed_time?: string | null; // ✅ FIXED
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
  const url = `${ADMIN_BASE.replace(/\/$/, "")}/api/stations/${encodeURIComponent(code)}`;
  const resp = await fetch(url, { cache: "no-store" });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Failed to load station: ${resp.status} ${txt}`);
  }

  return (await resp.json()) as StationResp;
}

/* ---------------- SEO ---------------- */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const stationCode = extractStationCode(params.slug);

  try {
    const data = await fetchStation(stationCode);
    const name = data?.station?.StationName || stationCode;

    return {
      title: `Food delivery in train at ${name} (${stationCode}) | RailEats`,
      description: `Order food in train at ${name} (${stationCode})`,
    };
  } catch {
    return {
      title: `Food delivery in train | RailEats`,
      description: "Order food in train easily",
    };
  }
}

/* ---------------- page ---------------- */
export default async function Page({ params }: { params: { slug: string } }) {
  const raw = params.slug || "";
  const stationCode = extractStationCode(raw);
  const code = stationCode.toUpperCase();

  let stationResp: StationResp | null = null;

  try {
    stationResp = await fetchStation(code);
  } catch (err: any) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-md shadow p-4">
          <h2 className="text-lg font-semibold">Station information unavailable</h2>
          <pre className="mt-4 text-sm text-red-600">
            {String(err.message)}
          </pre>
        </div>
      </main>
    );
  }

  if (!raw.includes("-") && stationResp?.station?.StationName) {
    const seo = makeStationSlug(code, stationResp.station.StationName);
    permanentRedirect(`/Stations/${seo}`);
  }

  const station = stationResp.station;
  const restaurants = stationResp.restaurants ?? [];

  return (
    <main className="max-w-5xl mx-auto px-3 py-6">

      {/* HEADER */}
      <h1 className="text-2xl font-bold mb-4">
        {station?.StationName} ({station?.StationCode})
      </h1>

      {/* RESTAURANTS */}
      {restaurants.length === 0 ? (
        <div>No restaurants available</div>
      ) : (
        <div className="space-y-4">
          {restaurants.map((r) => {
            const openTime = r.open_time ?? "—";
            const closeTime = r.closed_time ?? "—";

            return (
              <div key={String(r.RestroCode)} className="border p-4 rounded">

                <div className="font-semibold text-lg">
                  {r.RestroName}
                </div>

                <div className="text-sm text-gray-600">
                  Rating: {r.RestroRating ?? "—"}
                </div>

                <div className="text-sm mt-1">
                  ⏰ {formatTimeRange(openTime, closeTime)}
                </div>

                <div className="text-sm mt-1">
                  Min Order: ₹{r.MinimumOrdermValue ?? "—"}
                </div>

                <a
                  href={`/Stations/${raw}/${encodeURIComponent(
                    `${r.RestroCode}-${r.RestroName ?? "Restaurant"}`
                  )}`}
                  className="inline-block mt-3 bg-green-600 text-white px-3 py-1 rounded"
                >
                  Order Now
                </a>

              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
