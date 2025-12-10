// app/trains/[slug]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

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

/** LOCAL helper (NOT exported) to create slug */
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

  const [routeRows, setRouteRows] = useState<any[]>([]);
  const [stationsWithVendorsFull, setStationsWithVendorsFull] = useState<any[]>([]);
  const [visibleRestros, setVisibleRestros] = useState<
    { stationCode: string; stationName: string; stationImage?: string | null; restros: any[] }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const STATION_LIMIT = 6;

  // Resolve params from various sources so fetch functions are defensive
  function resolveParams(trainArg?: string | null, dateArg?: string | null, boardingArg?: string | null) {
    const fromSlug = extractTrainNumberFromSlug(slug || (params && (params as any).slug) || "");
    const candidateTrain = (trainArg || trainNumber || fromSlug || "").toString().trim();
    const candidateDate = (dateArg || date || (searchParams && searchParams.get("date")) || todayYMD()).toString().trim();
    const candidateBoarding = (
      (boardingArg || boarding || (searchParams && searchParams.get("boarding")) || "")
        .toString()
        .trim()
    ).toUpperCase();
    return { train: candidateTrain, date: candidateDate, boarding: candidateBoarding };
  }

  // Fetch train route rows using /api/train-routes
  async function fetchRouteRows(trainNo?: string | null, d?: string | null) {
    const p = resolveParams(trainNo ?? null, d ?? null, null);
    if (!p.train) {
      setRouteRows([]);
      setError("missing params: train/date/boarding");
      return;
    }
    try {
      const url = `/api/train-routes?train=${encodeURIComponent(p.train)}&date=${encodeURIComponent(p.date)}${p.boarding ? `&boarding=${encodeURIComponent(p.boarding)}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j || !j.ok) {
        setRouteRows([]);
        setError(j?.error || "Failed to load train route");
      } else {
        const rows = Array.isArray(j.rows) ? j.rows : [];
        setRouteRows(rows);
        const tname = j?.train?.trainName ?? j?.trainName ?? "";
        setTrainName(String(tname || ""));
        // If boarding not set, pick first station on route (but we still show vendor stations separately)
        if (!boarding && rows.length) {
          const pick = (rows[0].StationCode || rows[0].stationCode || "").toUpperCase();
          setBoarding((prev) => prev || pick);
        }
      }
    } catch (e) {
      console.error("fetchRouteRows error", e);
      setError("Failed to fetch route rows");
      setRouteRows([]);
    }
  }

  // Fetch stations + vendors using /api/train-restros (full mode)
  async function fetchStationsWithVendorsFull(trainNo?: string | null, d?: string | null, boardingArg?: string | null) {
    const p = resolveParams(trainNo ?? null, d ?? null, boardingArg ?? null);
    if (!p.train) {
      setStationsWithVendorsFull([]);
      setError("missing params: train/date/boarding");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = `/api/train-restros?train=${encodeURIComponent(p.train)}&date=${encodeURIComponent(p.date)}${p.boarding ? `&boarding=${encodeURIComponent(p.boarding)}` : ""}&full=1`;
      const res = await fetch(url, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j || !j.ok) {
        setStationsWithVendorsFull([]);
        setError(j?.error || "No vendors found for this train");
      } else {
        const stations = Array.isArray(j.stations) ? j.stations : [];
        setStationsWithVendorsFull(stations);
        const tname = j?.train?.trainName ?? j?.trainName ?? "";
        setTrainName(String(tname || ""));
        // compute visible restros from boarding choice and stations data
        computeVisibleFromStations(p.boarding || "", stations);
      }
    } catch (e) {
      console.error("fetchStationsWithVendorsFull error", e);
      setStationsWithVendorsFull([]);
      setError("Failed to fetch vendors");
    } finally {
      setLoading(false);
    }
  }

  // compute visible restros from stations_full response (prefer these over routeRows)
  function computeVisibleFromStations(boardingCode: string, stations: any[]) {
    if (!Array.isArray(stations)) {
      setVisibleRestros([]);
      return;
    }
    const bc = (boardingCode || "").toUpperCase().trim();

    // If boardingCode has vendors, show those station first (and then next ones with vendors).
    // Otherwise, show all stations on route which have vendors (so user sees them without changing boarding).
    let result: { stationCode: string; stationName: string; stationImage?: string | null; restros: any[] }[] = [];

    if (bc) {
      const idx = stations.findIndex((s) => ((s.StationCode || s.station || "") || "").toUpperCase() === bc);
      if (idx >= 0) {
        const slice = stations.slice(idx, idx + STATION_LIMIT);
        result = slice
          .map((s) => ({
            stationCode: ((s.StationCode || s.station || "") || "").toUpperCase(),
            stationName: s.StationName || s.stationName || s.name || ((s.StationCode || s.station) || "").toUpperCase(),
            stationImage: s.image_url || s.station_image || null,
            restros: Array.isArray(s.vendors) ? s.vendors : s.restaurants || s.restros || [],
          }))
          .filter((g) => Array.isArray(g.restros) && g.restros.length > 0);
      }
    }

    // fallback: if result empty, show all stations on route that have vendors (so users see vendors even if boarding doesn't)
    if (!result.length) {
      result = stations
        .map((s) => ({
          stationCode: ((s.StationCode || s.station || "") || "").toUpperCase(),
          stationName: s.StationName || s.stationName || s.name || ((s.StationCode || s.station) || "").toUpperCase(),
          stationImage: s.image_url || s.station_image || null,
          restros: Array.isArray(s.vendors) ? s.vendors : s.restaurants || s.restros || [],
        }))
        .filter((g) => Array.isArray(g.restros) && g.restros.length > 0)
        .slice(0, STATION_LIMIT);
    }

    setVisibleRestros(result);
  }

  // When routeRows or stationsWithVendorsFull changes, recompute visible restros (keeps UI in sync)
  useEffect(() => {
    // If we already have stationsWithVendorsFull, prefer computeVisibleFromStations
    if (stationsWithVendorsFull && stationsWithVendorsFull.length) {
      computeVisibleFromStations((boarding || "").toUpperCase(), stationsWithVendorsFull);
    } else {
      // fallback: compute from routeRows using restros field on routeRows items (older API)
      if (!routeRows || !routeRows.length) {
        setVisibleRestros([]);
        return;
      }
      const idx = routeRows.findIndex((r) => ((r.StationCode || r.stationCode || "") || "").toUpperCase() === (boarding || "").toUpperCase());
      const slice = idx >= 0 ? routeRows.slice(idx, idx + STATION_LIMIT) : routeRows.slice(0, STATION_LIMIT);

      const grouped = slice
        .map((r: any) => {
          const sc = ((r.StationCode || r.stationCode || "") || "").toUpperCase();
          const restrosRaw = r.restros || r.RestroMaster || r.restro || [];
          const restros = Array.isArray(restrosRaw)
            ? restrosRaw.filter((x: any) => {
                if (x.isActive === false) return false;
                if (typeof x.IsActive !== "undefined" && x.IsActive === false) return false;
                return true;
              })
            : [];
          return {
            stationCode: sc,
            stationName: r.StationName || r.stationName || sc,
            stationImage: null,
            restros,
          };
        })
        .filter((g) => Array.isArray(g.restros) && g.restros.length > 0);

      setVisibleRestros(grouped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeRows, stationsWithVendorsFull, boarding]);

  // Single effect to fetch both route + vendors on mount / slug change.
  // We pass explicit values from search params to avoid hydration race (state may be empty during first render).
  useEffect(() => {
    const fromSlug = extractTrainNumberFromSlug(slug || "");
    const tr = fromSlug || trainNumber || initialTrainNumber;
    const qDate = (searchParams && searchParams.get("date")) || date || initialDate;
    const qBoard = (searchParams && searchParams.get("boarding")) || boarding || initialBoarding;

    // fetch both in parallel
    fetchRouteRows(tr || undefined, qDate || undefined);
    fetchStationsWithVendorsFull(tr || undefined, qDate || undefined, qBoard || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function chooseVendor(restro: any, stationCode?: string, stationName?: string, stationImage?: string | null) {
    try {
      const payload = {
        train: trainNumber || "",
        trainName: trainName || "",
        date,
        boarding: boarding || "",
        restro: restro?.RestroCode ?? restro?.restroCode ?? restro?.id ?? null,
        station: stationCode || (restro && (restro.StationCode || restro.station || null)) || null,
      };
      sessionStorage.setItem("raileats_train_search", JSON.stringify(payload));
    } catch (e) {
      console.warn("session storage failed", e);
    }

    const slugForNav = makeTrainSlugLocal(trainNumber, trainName || undefined);
    const q = new URLSearchParams({
      date,
      boarding: boarding || "",
      restro: String(restro?.RestroCode ?? restro?.restroCode ?? ""),
    }).toString();
    router.push(`/trains/${encodeURIComponent(slugForNav)}?${q}`);
  }

  return (
    <main className="site-container page-safe-bottom py-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{trainNumber ? `Train ${trainNumber}` : "Train"} {trainName ? `— ${trainName}` : ""}</h1>
          <p className="text-sm text-gray-600 mt-1">Choose boarding station & date — we show stations on the route that have active restaurants (you don't need to change boarding to see them).</p>
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
                value={boarding || ""}
                onChange={(e) => setBoarding(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select boarding station</option>
                {routeRows.map((r: any) => (
                  <option key={r.StationCode || r.stationCode || r.StnNumber} value={(r.StationCode || r.stationCode || "").toUpperCase()}>
                    {(r.StationName || r.stationName || (r.StationCode || r.stationCode || ""))} {(r.StationCode || r.stationCode) ? `(${(r.StationCode || r.stationCode).toUpperCase()})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="card-safe p-4 text-center">Loading route & vendors…</div>
        ) : error ? (
          <div className="card-safe p-4 text-red-600">{error}</div>
        ) : (
          <>
            <div className="card-safe p-4 mb-4">
              <h3 className="font-semibold mb-2">Available Restaurants on Your Route</h3>

              {visibleRestros.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded text-sm text-gray-700">No active restaurants found for your journey.</div>
              ) : (
                <div className="space-y-4">
                  {visibleRestros.map((grp) => (
                    <div key={grp.stationCode} className="p-3 border rounded bg-gray-50">
                      <div className="flex items-center gap-3 mb-3">
                        {grp.stationImage ? (
                          <img src={grp.stationImage} alt={grp.stationName} loading="lazy" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6 }} />
                        ) : (
                          <div style={{ width: 64, height: 64 }} className="bg-gray-100 rounded flex items-center justify-center text-sm text-gray-400">Station</div>
                        )}
                        <div>
                          <div className="font-medium">{grp.stationName} ({grp.stationCode})</div>
                          <div className="text-xs text-gray-500">Arrival: { /* best effort, some APIs include arrival time */ ""}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {grp.restros.map((r: any) => {
                          const restroCode = r.RestroCode ?? r.restroCode ?? r.id ?? r.RestroId ?? String(r?.RestroCode || r?.restroCode || "");
                          const restroName = r.RestroName ?? r.restroName ?? r.name ?? "Vendor";
                          const minOrder = r.MinimumOrdermValue ?? r.minOrder ?? r.MinimumOrderValue ?? "—";
                          const openTime = r.OpenTime ?? r["0penTime"] ?? r.openTime ?? "—";
                          const closeTime = r.ClosedTime ?? r.closeTime ?? r.CloseTime ?? "—";
                          const photo = r.RestroDisplayPhoto ?? r.display_photo ?? r.photo ?? null;

                          return (
                            <div key={restroCode ?? restroName} className="flex items-center justify-between gap-3 p-2 bg-white rounded shadow-sm">
                              <div className="flex items-center gap-3">
                                <div style={{ width: 96, height: 64 }} className="bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                  {photo ? <img src={photo} alt={restroName} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>}
                                </div>

                                <div>
                                  <div className="font-medium">{restroName}</div>
                                  <div className="text-xs text-gray-500">Min order: {minOrder} • {openTime} - {closeTime}</div>
                                </div>
                              </div>

                              <div>
                                <button
                                  className="px-3 py-1 bg-green-600 text-white rounded"
                                  onClick={() => chooseVendor(r, grp.stationCode, grp.stationName, grp.stationImage)}
                                >
                                  Order Now
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
