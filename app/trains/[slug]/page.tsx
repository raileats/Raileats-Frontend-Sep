"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

/* ---------- helpers ---------- */
function todayYMD() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function extractTrainNumberFromSlug(slug?: string | null) {
  if (!slug) return "";
  const m = slug.match(/^(\d+)/);
  return m ? m[1] : slug.replace(/[^0-9]/g, "");
}
/** LOCAL helper to create slug */
function makeTrainSlugLocal(trainNoRaw: string, trainNameRaw?: string | null) {
  const clean = String(trainNoRaw || "").trim();
  if (!clean) return "";
  const digits = clean.replace(/\D+/g, "") || clean;
  let trainPart = "";
  if (trainNameRaw) {
    trainPart = String(trainNameRaw)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  return trainPart ? `${digits}-${trainPart}-train-food-delivery-in-train` : `${digits}-train-food-delivery-in-train`;
}

/* ---------- page component ---------- */
export default function TrainPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const slug = (params && (params as any).slug) || "";
  const initialTrainNumber = extractTrainNumberFromSlug(slug);
  const initialDate = (searchParams && searchParams.get("date")) || todayYMD();
  const initialBoarding = (searchParams && searchParams.get("boarding")) || "";

  const [trainNumber, setTrainNumber] = useState(initialTrainNumber);
  const [trainName, setTrainName] = useState<string>("");
  const [date, setDate] = useState(initialDate);
  const [boarding, setBoarding] = useState(initialBoarding);

  const [routeRows, setRouteRows] = useState<any[]>([]); // full route rows (TrainRoute)
  const [stationsWithVendors, setStationsWithVendors] = useState<any[]>([]); // from /api/train-restros
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // fetch full route (TrainRoute) — used to populate boarding dropdown
  async function fetchRouteRows(trainNo: string, d: string) {
    if (!trainNo) {
      setRouteRows([]);
      return;
    }
    try {
      const url = `/api/train-routes?train=${encodeURIComponent(String(trainNo))}&date=${encodeURIComponent(String(d))}`;
      const res = await fetch(url, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j || !j.ok) {
        setRouteRows([]);
        setError(j?.error || "Failed to load train route");
      } else {
        setRouteRows(Array.isArray(j.rows) ? j.rows : []);
        const tname = j?.train?.trainName ?? j?.trainName ?? "";
        setTrainName(String(tname || ""));
        // if boarding not set pick first station code
        if (!boarding && Array.isArray(j.rows) && j.rows.length) {
          const pick = (j.rows[0].StationCode || j.rows[0].stationCode || j.rows[0].Station || "").toUpperCase();
          setBoarding((prev) => prev || pick);
        }
      }
    } catch (e) {
      console.error("fetchRouteRows error", e);
      setError("Failed to fetch route rows");
      setRouteRows([]);
    }
  }

  // fetch stations with vendors using train-restros endpoint (server does RestroMaster + admin fallback).
  // Use full=1 to scan the whole route and return only stations that have vendors.
  async function fetchStationsWithVendors(trainNo: string, d: string, boardingCode: string | null = null) {
    if (!trainNo) {
      setStationsWithVendors([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const base = `/api/train-restros?train=${encodeURIComponent(String(trainNo))}&date=${encodeURIComponent(String(d))}&full=1`;
      const url = boardingCode ? `${base}&boarding=${encodeURIComponent(boardingCode)}` : base;
      const res = await fetch(url, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j || !j.ok) {
        setStationsWithVendors([]);
        setError(j?.error || "No vendors found");
      } else {
        // server returns stations: [{StationCode, StationName, arrival_time, Day, vendors: [...] }]
        setStationsWithVendors(Array.isArray(j.stations) ? j.stations : []);
        const tname = j?.train?.trainName ?? j?.trainName ?? "";
        setTrainName(String(tname || ""));
      }
    } catch (e) {
      console.error("fetchStationsWithVendors error", e);
      setError("Failed to fetch vendors");
      setStationsWithVendors([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const tr = initialTrainNumber || trainNumber;
    fetchRouteRows(tr, date);
    fetchStationsWithVendors(tr, date, boarding || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!trainNumber) return;
    fetchRouteRows(trainNumber, date);
    fetchStationsWithVendors(trainNumber, date, boarding || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, boarding, trainNumber]);

  // choose vendor -> save session and navigate to train page with restro param + date/boarding
  function chooseVendor(restro: any) {
    try {
      const payload = {
        train: trainNumber,
        trainName,
        date,
        boarding,
        restro: restro?.RestroCode ?? restro?.restroCode ?? restro?.RestroId ?? restro?.id ?? null,
      };
      sessionStorage.setItem("raileats_train_search", JSON.stringify(payload));
    } catch (e) {
      console.warn("session storage failed", e);
    }
    const slugForNav = makeTrainSlugLocal(trainNumber, trainName || undefined);
    const q = new URLSearchParams({ date, boarding: boarding || "", restro: String(restro?.RestroCode ?? restro?.restroCode ?? "") }).toString();
    router.push(`/trains/${encodeURIComponent(slugForNav)}?${q}`);
  }

  return (
    <main className="site-container page-safe-bottom py-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{trainNumber ? `Train ${trainNumber}` : "Train"} {trainName ? `— ${trainName}` : ""}</h1>
          <p className="text-sm text-gray-600 mt-1">Choose boarding station & date, then pick a vendor from stations that have active restaurants.</p>
        </div>

        <div className="card-safe p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Journey date</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-gray-600 block mb-1">Boarding station</label>
              <select
                value={boarding}
                onChange={(e) => setBoarding(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="" disabled>Select boarding station</option>
                {routeRows.map((r: any) => {
                  const sc = (r.StationCode || r.stationCode || r.station || "").toUpperCase();
                  return (
                    <option key={r.StnNumber ?? sc} value={sc}>
                      {(r.StationName || r.stationName || r.StationCode || sc)} {sc ? `(${sc})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="card-safe p-4 text-center">Loading available restaurants…</div>
        ) : error ? (
          <div className="card-safe p-4 text-red-600">{error}</div>
        ) : (
          <>
            <div className="card-safe p-4 mb-4">
              <h3 className="font-semibold mb-3">Available Restaurants on Your Route</h3>

              {stationsWithVendors.length === 0 ? (
                <div className="text-sm text-gray-600">No active restaurants found for your journey.</div>
              ) : (
                <div className="space-y-4">
                  {stationsWithVendors.map((st) => (
                    <div key={st.StationCode} className="p-3 border rounded bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium">{st.StationName || st.stationName || st.StationCode} ({st.StationCode})</div>
                          <div className="text-xs text-gray-500">Arrival: {String(st.arrival_time ?? st.arrival_time ?? "—").slice(0,5)} • Day: {st.Day ?? "-"}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 mt-2">
                        {Array.isArray(st.vendors) && st.vendors.map((r: any) => {
                          const restroCode = r.RestroCode ?? r.restroCode ?? r.id ?? r.restro_id;
                          const restroName = r.RestroName ?? r.restroName ?? r.name ?? "Vendor";
                          const minOrder = r.MinimumOrdermValue ?? r.minOrder ?? "—";
                          const openTime = r.OpenTime ?? r["0penTime"] ?? "—";
                          const closeTime = r.ClosedTime ?? r.closeTime ?? "—";

                          return (
                            <div key={String(restroCode ?? restroName)} className="flex items-center justify-between gap-3 p-2 bg-white rounded shadow-sm">
                              <div>
                                <div className="font-medium">{restroName}</div>
                                <div className="text-xs text-gray-500">Min order: {minOrder} • {openTime} - {closeTime}</div>
                              </div>
                              <div>
                                <button
                                  className="px-3 py-1 bg-green-600 text-white rounded"
                                  onClick={() => chooseVendor(r)}
                                >
                                  Choose
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
