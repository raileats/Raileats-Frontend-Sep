import React from "react";
import type { Metadata } from "next";
import { redirect, permanentRedirect } from "next/navigation";
import { makeStationSlug, extractStationCode } from "../../lib/stationSlug";

/* ---------------- types ---------------- */
type Restro = {
  RestroCode: string | number;
  RestroName?: string;
  RestroRating?: number | null;
  OpenTime?: string | null;
  ClosedTime?: string | null;
  MinimumOrderValue?: number | null;
};

type StationData = {
  StationCode: string;
  StationName: string;
  display_date?: string; // API se aane wali date
  Arrives?: string;
  vendors: Restro[];
};

type APIResponse = {
  ok: boolean;
  stations: StationData[];
};

export const dynamic = "force-dynamic";

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

/* ---------------- page ---------------- */
export default async function Page({ params, searchParams }: any) {
  const rawSlug = params.slug || "";
  const stationCode = extractStationCode(rawSlug).toUpperCase();

  // URL se query params nikalna
  const trainNum = searchParams.train || "";
  const dateParam = searchParams.date || ""; // YYYY-MM-DD
  const boarding = searchParams.boarding || "";

  let displayDate = "";
  let arrivalTime = "";
  let restaurants: Restro[] = [];
  let stationName = stationCode;

  try {
    // ✅ API Call: Hum train-restros API ko hi call karenge kyunki wahi calculation kar raha hai
    const apiUrl = `${ADMIN_BASE}/api/train-restros?train=${trainNum}&date=${dateParam}&boarding=${boarding}`;
    const resp = await fetch(apiUrl, { cache: "no-store" });
    const data: APIResponse = await resp.json();

    if (data.ok && data.stations) {
      // Is list mein se sirf wahi station dhundo jiska slug khula hai
      const currentStation = data.stations.find(s => s.StationCode === stationCode);
      
      if (currentStation) {
        displayDate = currentStation.display_date || "";
        arrivalTime = currentStation.Arrives || "";
        restaurants = currentStation.vendors || [];
        stationName = currentStation.StationName || stationCode;
      }
    }
  } catch (err) {
    console.error("Fetch Error:", err);
  }

  return (
    <main className="max-w-5xl mx-auto px-3 py-6">
      
      {/* ✅ DATE & TIME HEADER (Directly from API) */}
      {displayDate && (
        <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl mb-6 flex justify-between items-center shadow-sm">
          <div>
            <p className="text-[10px] text-orange-600 font-black uppercase tracking-widest mb-1">Delivery Date</p>
            <p className="text-base font-bold text-gray-800">{displayDate}</p>
          </div>
          {arrivalTime && (
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Arrival Time</p>
              <p className="text-base font-bold text-gray-800">{arrivalTime.slice(0, 5)}</p>
            </div>
          )}
        </div>
      )}

      <h1 className="text-2xl font-black mb-6 text-gray-900">
        Restaurants at {stationName}
      </h1>

      {restaurants.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-3xl text-gray-400">
          No restaurants found for this selection.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {restaurants.map((r) => (
            <div key={r.RestroCode} className="border p-5 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg">{r.RestroName}</h3>
                <span className="text-xs font-bold bg-green-50 text-green-700 px-2 py-1 rounded">★ {r.RestroRating}</span>
              </div>
              
              <div className="mt-3 space-y-1 text-sm text-gray-600">
                <p>⏰ {r.OpenTime} - {r.ClosedTime}</p>
                <p>💰 Min Order: ₹{r.MinimumOrderValue}</p>
              </div>

              <a
                href={`/Stations/${rawSlug}/${r.RestroCode}-${(r.RestroName || "").replace(/\s+/g, "-")}?date=${displayDate}&train=${trainNum}`}
                className="mt-5 block w-full text-center bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors"
              >
                View Menu
              </a>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
