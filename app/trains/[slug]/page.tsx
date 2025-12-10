// app/trains/[slug]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

/* ---------------- helpers ---------------- */
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
function slugifyNameForStation(name?: string | null) {
  if (!name) return "";
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function makeStationSeoSlug(stationCode: string, stationName?: string | null) {
  const code = (stationCode || "").toUpperCase();
  const slugName = slugifyNameForStation(stationName || "");
  return slugName ? `${code}-${slugName}-food-delivery-in-train` : `${code}-food-delivery-in-train`;
}

/* ---------------- component ---------------- */
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
  const [boarding, setBoarding] = useState(initialBoarding.toUpperCase());

  const [routeRows, setRouteRows] = useState<any[]>([]);
  const [stationsWithVendorsFull, setStationsWithVendorsFull] = useState<any[]>([]);
  const [visibleRestros, setVisibleRestros] = useState<
    { stationCode: string; stationName: string; stationImage?: string | null; restros: any[] }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const STATION_LIMIT = 6;

  function resolveParams(trainArg?: string | null, dateArg?: string | null, boardingArg?: string | null) {
    const fromSlug = extractTrainNumberFromSlug(slug || "");
    const candidateTrain = (trainArg || trainNumber || fromSlug || "").toString().trim();
    const candidateDate = (dateArg || date || (searchParams && searchParams.get("date")) || todayYMD()).toString().trim();
    const candidateBoarding = ((boardingArg || boarding || (searchParams && searchParams.get("boarding")) || "") || "").toString().trim().toUpperCase();
    return { train: candidateTrain, date: candidateDate, boarding: candidateBoarding };
  }

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

  // Prefer full vendor dataset from /api/train-restros (full)
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
        // compute visible list immediately
        computeVisibleFromStations((p.boarding || "").toUpperCase(), stations);
      }
    } catch (e) {
      console.error("fetchStationsWithVendorsFull error", e);
      setStationsWithVendorsFull([]);
      setError("Failed to fetch vendors");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Always show stations that have vendors.
   * Reorder them so that stations after (and including) the boarding station appear first,
   * but do NOT require the boarding station itself to have vendors.
   */
  function computeVisibleFromStations(boardingCode: string, stations: any[]) {
    if (!Array.isArray(stations) || stations.length === 0) {
      setVisibleRestros([]);
      return;
    }

    // normalize vendor presence and original index
    const normalized = stations.map((s: any, idx: number) => {
      const vendors = Array.isArray(s.vendors) ? s.vendors : Array.isArray(s.restaurants) ? s.restaurants : Array.isArray(s.vendors) ? s.vendors : s.vendors || [];
      return {
        originalIndex: idx,
        stationCode: ((s.StationCode || s.station || "") || "").toUpperCase(),
        stationName: s.StationName || s.stationName || s.name || "",
        stationImage: s.image_url || s.station_image || null,
        vendors: vendors || [],
      };
    });

    // only stations that actually have vendors
    const vendorStations = normalized.filter((s) => Array.isArray(s.vendors) && s.vendors.length > 0);
    if (!vendorStations.length) {
      setVisibleRestros([]);
      return;
    }

    const n = normalized.length;
    // find boarding index in the original stations list
    const boardingIndex = normalized.findIndex((s) => s.stationCode === (boardingCode || "").toUpperCase());

    // If boarding not found, just take first N vendorStations
    if (boardingIndex < 0) {
      const first = vendorStations.slice(0, STATION_LIMIT).map((s) => ({
        stationCode: s.stationCode,
        stationName: s.stationName || s.stationCode,
        stationImage: s.stationImage,
        restros: s.vendors,
      }));
      setVisibleRestros(first);
      return;
    }

    // Re-order vendorStations to place those whose originalIndex >= boardingIndex first (in original order),
    // then the earlier ones (wrap-around).
    const after = vendorStations.filter((s) => s.originalIndex >= boardingIndex);
    const before = vendorStations.filter((s) => s.originalIndex < boardingIndex);
    const ordered = after.concat(before).slice(0, STATION_LIMIT).map((s) => ({
      stationCode: s.stationCode,
      stationName: s.stationName || s.stationCode,
      stationImage: s.stationImage,
      restros: s.vendors,
    }));

    setVisibleRestros(ordered);
  }

  // recompute visible restros if routeRows or stationsWithVendorsFull changes
  useEffect(() => {
    if (stationsWithVendorsFull && stationsWithVendorsFull.length) {
      computeVisibleFromStations((boarding || "").toUpperCase(), stationsWithVendorsFull);
    } else {
      // fallback to older routeRows mapping if vendor info is embedded in routeRows
      if (!routeRows || routeRows.length === 0) {
        setVisibleRestros([]);
        return;
      }
      const idx = routeRows.findIndex((r) => ((r.StationCode || r.stationCode || "") || "").toUpperCase() === (boarding || "").toUpperCase());
      const slice = idx >= 0 ? routeRows.slice(idx, idx + STATION_LIMIT) : routeRows.slice(0, STATION_LIMIT);

      const grouped = slice
        .map((r: any) => {
          const sc = ((r.StationCode || r.stationCode || "") || "").toUpperCase();
          const restrosRaw = r.restros || r.RestroMaster || r.restro || r.restaurants || [];
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

  // Fetch on mount / slug change
  useEffect(() => {
    const fromSlug = extractTrainNumberFromSlug(slug || "");
    const tr = fromSlug || trainNumber || initialTrainNumber;
    const qDate = (searchParams && searchParams.get("date")) || date || initialDate;
    const qBoard = (searchParams && searchParams.get("boarding")) || boarding || initialBoarding;
    fetchRouteRows(tr || undefined, qDate || undefined);
    fetchStationsWithVendorsFull(tr || undefined, qDate || undefined, qBoard || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function restroStationLink(stationCode: string, stationName: string | null | undefined, restroCode: any, restroName: string | null | undefined) {
    // station seo slug same format as Stations page
    const stationSeo = makeStationSeoSlug(stationCode || "", stationName || "");
    // restro slug on station page is encodeURIComponent(`${RestroCode}-${RestroName}`)
    const restroSlug = encodeURIComponent(`${restroCode}-${restroName ?? "Restaurant"}`);
    return `/Stations/${stationSeo}/${restroSlug}`;
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
                onChange={(e) => setBoarding(e.target.value.toUpperCase())}
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
                          <div className="text-xs text-gray-500">Vendors at this station</div>
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

                          const link = restroStationLink(grp.stationCode, grp.stationName, restroCode, restroName);

                          return (
                            <div key={String(restroCode) + restroName} className="flex items-center justify-between gap-3 p-2 bg-white rounded shadow-sm">
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
                                {/* Use anchor so it behaves exactly like station page Order Now */}
                                <a
                                  href={link}
                                  className="px-3 py-1 bg-green-600 text-white rounded inline-block"
                                  onClick={() => {
                                    try {
                                      const payload = {
                                        train: trainNumber || "",
                                        trainName: trainName || "",
                                        date,
                                        boarding: boarding || "",
                                        restro: String(restroCode ?? ""),
                                        station: grp.stationCode || "",
                                      };
                                      sessionStorage.setItem("raileats_train_search", JSON.stringify(payload));
                                    } catch (e) {
                                      // ignore
                                    }
                                  }}
                                >
                                  Order Now
                                </a>
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
