import React from "react";
import type { Metadata } from "next";
import { redirect, permanentRedirect } from "next/navigation";
import { makeStationSlug, extractStationCode } from "../../lib/stationSlug";
import { serviceClient } from "../../lib/supabaseServer"; // Direct Supabase use for calculation

/* ---------------- types ---------------- */
type Restro = {
  RestroCode: string | number;
  RestroName?: string;
  RestroRating?: number | null;
  open_time?: string | null;
  closed_time?: string | null;
  MinimumOrdermValue?: number | null;
};

type StationResp = {
  station: { StationCode: string; StationName: string | null; State?: string | null; } | null;
  restaurants: Restro[];
};

export const dynamic = "force-dynamic";

/* ---------------- helpers ---------------- */
function formatTimeRange(open?: string | null, close?: string | null) {
  if (!open && !close) return "—";
  return `${open?.slice(0,5)} to ${close?.slice(0,5)}`;
}

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

// 1. Fetch Station & Restros
async function fetchStation(code: string): Promise<StationResp> {
  const url = `${ADMIN_BASE.replace(/\/$/, "")}/api/stations/${encodeURIComponent(code)}`;
  const resp = await fetch(url, { cache: "no-store" });
  return (await resp.json()) as StationResp;
}

// 2. ✅ NEW: Logic to calculate Date from TrainRoute (Deep Logic)
async function calculateArrivalInfo(trainNum: string, boardingCode: string, stationCode: string, startDate: string) {
  if (!trainNum || !boardingCode || !startDate) return null;

  const { data: route } = await serviceClient
    .from("TrainRoute")
    .select("StationCode, Day, Arrives")
    .eq("trainNumber", trainNum)
    .order("StnNumber", { ascending: true });

  if (!route) return null;

  const bStation = route.find(r => r.StationCode.toUpperCase() === boardingCode.toUpperCase());
  const cStation = route.find(r => r.StationCode.toUpperCase() === stationCode.toUpperCase());

  if (!bStation || !cStation) return null;

  const baseDay = Number(bStation.Day || 1);
  const currentDay = Number(cStation.Day || 1);
  const dayDiff = currentDay - baseDay;

  const d = new Date(startDate + "T00:00:00");
  d.setDate(d.getDate() + dayDiff);

  return {
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    arrival: cStation.Arrives
  };
}

/* ---------------- Page ---------------- */
export default async function Page({ params, searchParams }: any) {
  const raw = params.slug || "";
  const stationCode = extractStationCode(raw);
  const code = stationCode.toUpperCase();

  // URL se zaroori cheezein nikaalna
  const trainNum = searchParams.train as string;
  const boarding = searchParams.boarding as string;
  const startDate = searchParams.date as string; // format: YYYY-MM-DD

  // Parallel Fetching: Station Data + Route Calculation
  const [stationResp, routeInfo] = await Promise.all([
    fetchStation(code),
    calculateArrivalInfo(trainNum, boarding, code, startDate)
  ]);

  const station = stationResp?.station;
  const restaurants = stationResp?.restaurants ?? [];

  // Agar user ne train select ki hai, toh routeInfo se date milegi, warna URL params se check karenge
  const finalDate = routeInfo?.date || (searchParams.date as string);
  const finalArrival = routeInfo?.arrival || (searchParams.arrival as string);

  return (
    <main className="max-w-5xl mx-auto px-3 py-6">
      
      {/* ✅ DYNAMIC HEADER */}
      {finalDate && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-6 flex justify-between items-center shadow-sm">
          <div>
            <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mb-1">Delivery Date</p>
            <p className="text-base font-bold text-gray-800">{finalDate}</p>
          </div>
          {finalArrival && (
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Train Arrival</p>
              <p className="text-base font-bold text-gray-800">{finalArrival.slice(0, 5)}</p>
            </div>
          )}
        </div>
      )}

      <h1 className="text-2xl font-black mb-6 text-gray-900">
        Order Food at {station?.StationName || code}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {restaurants.map((r) => (
          <div key={r.RestroCode} className="border p-5 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-lg">{r.RestroName}</h3>
              <span className="text-xs font-bold bg-green-50 text-green-700 px-2 py-1 rounded">★ {r.RestroRating || "4.2"}</span>
            </div>
            
            <div className="mt-3 space-y-1 text-sm text-gray-600 font-medium">
              <p>⏰ {formatTimeRange(r.open_time, r.closed_time)}</p>
              <p>💰 Min Order: ₹{r.MinimumOrdermValue || 0}</p>
            </div>

            <a
              href={`/Stations/${raw}/${r.RestroCode}-${(r.RestroName || "").replace(/\s+/g, "-")}?date=${finalDate}&train=${trainNum}`}
              className="mt-5 block w-full text-center bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors"
            >
              Select Items
            </a>
          </div>
        ))}
      </div>
    </main>
  );
}
