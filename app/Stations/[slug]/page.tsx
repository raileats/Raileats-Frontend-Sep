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
  open_time?: string | null;   
  closed_time?: string | null; 
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
export default async function Page({ 
  params, 
  searchParams 
}: { 
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const raw = params.slug || "";
  const stationCode = extractStationCode(raw);
  const code = stationCode.toUpperCase();

  // Search Flow Params
  const queryDate = searchParams.date as string; // E.g. "12 Oct 2026"
  const arrivalTime = searchParams.arrival as string; // E.g. "14:30:00"

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

      {/* ✅ NEW DATE & TIME HEADER (Only shows if coming from search) */}
      {queryDate && (
        <div className="mb-2">
           <span className="text-orange-600 font-bold text-xs uppercase tracking-wider">
             Delivery Date: {queryDate}
           </span>
           {arrivalTime && (
             <span className="text-gray-400 text-xs ml-2">
               | Arrival: {arrivalTime.slice(0, 5)}
             </span>
           )}
        </div>
      )}

      {/* HEADER */}
      <h1 className="text-2xl font-bold mb-6 text-gray-900">
        Food Delivery at {station?.StationName} ({station?.StationCode})
      </h1>

      {/* RESTAURANTS */}
      {restaurants.length === 0 ? (
        <div className="py-10 text-center text-gray-400 border-2 border-dashed rounded-xl">
          No restaurants available at this station.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {restaurants.map((r) => {
            const openTime = r.open_time ?? "—";
            const closeTime = r.closed_time ?? "—";

            return (
              <div key={String(r.RestroCode)} className="border border-gray-100 p-4 rounded-xl shadow-sm bg-white hover:shadow-md transition-shadow">

                <div className="flex justify-between items-start">
                  <div className="font-bold text-lg text-gray-800">
                    {r.RestroName}
                  </div>
                  <div className="bg-green-50 text-green-700 text-xs font-bold px-2 py-1 rounded">
                    ★ {r.RestroRating ?? "4.2"}
                  </div>
                </div>

                <div className="flex flex-col gap-1 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <span>⏰</span> {formatTimeRange(openTime, closeTime)}
                  </div>
                  <div className="flex items-center gap-1">
                    <span>💰</span> Min Order: ₹{r.MinimumOrdermValue ?? "0"}
                  </div>
                </div>

                {/* ✅ Link Pass Logic: Carrying Date & Arrival to Menu Page */}
                <a
                  href={`/Stations/${raw}/${encodeURIComponent(
                    `${r.RestroCode}-${(r.RestroName ?? "Restaurant").replace(/\s+/g, '-')}`
                  )}?date=${queryDate || ""}&arrival=${arrivalTime || ""}`}
                  className="w-full text-center block mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg transition-colors"
                >
                  View Menu & Order
                </a>

              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
