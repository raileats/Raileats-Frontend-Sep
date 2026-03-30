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

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

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
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const stationCode = extractStationCode(params.slug);
  try {
    const data = await fetchStation(stationCode);
    const name = data?.station?.StationName || stationCode;
    return {
      title: `Food delivery in train at ${name} (${stationCode}) | RailEats`,
      description: `Order food in train at ${name} (${stationCode})`,
    };
  } catch {
    return { title: `Food delivery in train | RailEats`, description: "Order food in train easily" };
  }
}

/* ---------------- page ---------------- */
// ✅ FIXED: searchParams ko correctly destructure kiya
export default async function Page({ 
  params, 
  searchParams 
}: { 
  params: { slug: string }; 
  searchParams: { [key: string]: string | undefined }; 
}) {
  const raw = params.slug || "";
  const stationCode = extractStationCode(raw);
  const code = stationCode.toUpperCase();

  // ✅ URL se date aur arrival utha rahe hain
  const queryDate = searchParams.date; 
  const arrivalTime = searchParams.arrival;

  let stationResp: StationResp | null = null;
  try {
    stationResp = await fetchStation(code);
  } catch (err: any) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-md shadow p-4">
          <h2 className="text-lg font-semibold">Station information unavailable</h2>
          <pre className="mt-4 text-sm text-red-600">{String(err.message)}</pre>
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
      
      {/* ✅ HEADER SECTION: Date aur Time yahan dikhega */}
      {queryDate && (
        <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl mb-4 flex justify-between items-center">
          <div>
            <div className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Delivery Date</div>
            <div className="text-sm font-bold text-gray-800">{queryDate}</div>
          </div>
          {arrivalTime && (
            <div className="text-right">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Train Arrival</div>
              <div className="text-sm font-bold text-gray-800">{arrivalTime.slice(0, 5)}</div>
            </div>
          )}
        </div>
      )}

      {/* MAIN STATION TITLE */}
      <h1 className="text-2xl font-bold mb-6 text-gray-900">
        Restaurants at {station?.StationName} ({station?.StationCode})
      </h1>

      {/* RESTAURANTS */}
      {restaurants.length === 0 ? (
        <div className="text-gray-500 py-10 text-center border-2 border-dashed rounded-xl">
          No restaurants available at this station.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {restaurants.map((r) => {
            const openTime = r.open_time ?? null;
            const closedTime = r.closed_time ?? null;

            return (
              <div key={String(r.RestroCode)} className="border p-5 rounded-2xl shadow-sm bg-white flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="font-bold text-lg text-gray-800">{r.RestroName}</h2>
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">★ {r.RestroRating || "4.2"}</span>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="grayscale opacity-50">⏰</span> {formatTimeRange(openTime, closedTime)}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="grayscale opacity-50">💰</span> Min Order: ₹{r.MinimumOrdermValue ?? "0"}
                    </div>
                  </div>
                </div>

                {/* ✅ Passing Params to Menu Page */}
                <a
                  href={`/Stations/${raw}/${encodeURIComponent(`${r.RestroCode}-${(r.RestroName ?? "Restaurant").replace(/\s+/g, "-")}`)}?date=${encodeURIComponent(queryDate || "")}&arrival=${encodeURIComponent(arrivalTime || "")}`}
                  className="w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl transition-all active:scale-95"
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
