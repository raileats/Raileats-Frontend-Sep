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
function slugify(s?: string | null) {
  return (String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "").replace(/-+/g, "-");
}
function makeTrainSlugLocal(trainNoRaw: string, trainNameRaw?: string | null) {
  const clean = String(trainNoRaw || "").trim();
  if (!clean) return "";
  const digits = clean.replace(/\D+/g, "") || clean;
  let trainPart = "";
  if (trainNameRaw) {
    trainPart = slugify(trainNameRaw);
  }
  return trainPart ? `${digits}-${trainPart}-train-food-delivery-in-train` : `${digits}-train-food-delivery-in-train`;
}
function makeStationSlugLocal(code: string, name?: string | null) {
  const c = String(code || "").toUpperCase();
  const part = name ? slugify(name) : "";
  return part ? `${c}-${part}-food-delivery-in-train` : `${c}-food-delivery-in-train`;
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
  const [boarding, setBoarding] = useState(initialBoarding);

  const [routeRows, setRouteRows] = useState<any[]>([]);
  const [stationsWithVendorsFull, setStationsWithVendorsFull] = useState<any[]>([]);
  const [stationImages, setStationImages] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    }
  }

  async function fetchStationsWithVendorsFull(trainNo: string, d: string) {
    if (!trainNo) {
      setStationsWithVendorsFull([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = `/api/train-restros?train=${encodeURIComponent(String(trainNo))}&date=${encodeURIComponent(String(d))}&full=1`;
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
        const codes = stations.map((s: any) => (s.StationCode || s.station || "").toUpperCase()).filter(Boolean);
        fetchStationImages(codes);
      }
    } catch (e) {
      console.error("fetchStationsWithVendorsFull error", e);
      setStationsWithVendorsFull([]);
      setError("Failed to fetch vendors");
    } finally {
      setLoading(false);
    }
  }

  async function fetchStationImages(codes: string[]) {
    const out: Record<string, string | null> = { ...stationImages };
    const need = codes.filter((c) => typeof out[c] === "undefined");
    if (!need.length) {
      setStationImages(out);
      return;
    }
    await Promise.all(
      need.map(async (code) => {
        try {
          const a = await fetch(`https://admin.raileats.in/api/stations/${encodeURIComponent(code)}`, { cache: "no-store" });
          const j = await a.json().catch(() => null);
          const url = j?.station?.image_url ?? null;
          out[code] = url;
        } catch {
          out[code] = null;
        }
      })
    );
    setStationImages(out);
  }

  function getOrderedStationsToShow() {
    const stations = stationsWithVendorsFull || [];
    if (!boarding) return stations;
    const codeUpper = boarding.toUpperCase();
    const pos: Record<string, number> = {};
    routeRows.forEach((r: any, i: number) => {
      const sc = (r.StationCode || r.stationCode || "").toUpperCase();
      if (sc) pos[sc] = i;
    });
    const sorted = [...stations].sort((a: any, b: any) => {
      const aa = (a.StationCode || a.station || "").toUpperCase();
      const bb = (b.StationCode || b.station || "").toUpperCase();
      const ia = typeof pos[aa] === "number" ? pos[aa] : 99999;
      const ib = typeof pos[bb] === "number" ? pos[bb] : 99999;
      return ia - ib;
    });
    const boardingIndex = typeof pos[codeUpper] === "number" ? pos[codeUpper] : -1;
    if (boardingIndex >= 0) {
      const idx = sorted.findIndex((s: any) => {
        const sc = (s.StationCode || s.station || "").toUpperCase();
        const p = typeof pos[sc] === "number" ? pos[sc] : 99999;
        return p >= boardingIndex;
      });
      if (idx > 0) {
        const rotated = [...sorted.slice(idx), ...sorted.slice(0, idx)];
        return rotated;
      }
    }
    return sorted;
  }

  useEffect(() => {
    const tr = initialTrainNumber || trainNumber;
    if (!tr) return;
    fetchRouteRows(tr, date);
    fetchStationsWithVendorsFull(tr, date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!trainNumber) return;
    fetchRouteRows(trainNumber, date);
    fetchStationsWithVendorsFull(trainNumber, date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, trainNumber]);

  useEffect(() => {
    // ordering computed each render
  }, [boarding, stationsWithVendorsFull, routeRows]);

  function goToStationRestro(station: any, restro: any) {
    try {
      const payload = {
        train: trainNumber,
        trainName,
        date,
        boarding,
        restro: restro?.RestroCode ?? restro?.restroCode ?? restro?.id ?? null,
        station: ((station?.StationCode ?? station?.station) || null),
      };
      sessionStorage.setItem("raileats_train_search", JSON.stringify(payload));
    } catch (e) {
      console.warn("session storage failed", e);
    }

    const stationCode = (station.StationCode || station.station || "").toUpperCase();
    const stationName = station.StationName || station.stationName || station.station || "";
    const stationSlug = makeStationSlugLocal(stationCode, stationName);
    const restroCode = restro.RestroCode ?? restro.restroCode ?? restro.id ?? "";
    const restroSlugPart = encodeURIComponent(`${restroCode}-${restro.RestroName ?? restro.restroName ?? "Restaurant"}`);
    const href = `/Stations/${stationSlug}/${restroSlugPart}`;
    router.push(href);
  }

  const stationsToShow = getOrderedStationsToShow();

  return (
    <main className="site-container page-safe-bottom py-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{trainNumber ? `Train ${trainNumber}` : "Train"} {trainName ? `— ${trainName}` : ""}</h1>
          <p className="text-sm text-gray-600 mt-1">Choose boarding station & date — we show stations on the route that have active restaurants (you don’t need to change boarding to see them).</p>
        </div>

        <div className="card-safe p-4 mb-6">
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
                  const sc = (r.StationCode || r.stationCode || "").toUpperCase();
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
          <div className="space-y-6">
            {stationsToShow.length === 0 ? (
              <div className="card-safe p-4">No active restaurants found for this journey.</div>
            ) : (
              stationsToShow.map((st: any) => {
                const sc = (st.StationCode || st.station || "").toUpperCase();
                const stationName = st.StationName || st.stationName || st.station || sc;
                const img = stationImages[sc] ?? null;
                return (
                  <section key={sc} className="bg-white rounded-md shadow p-4">
                    <div className="flex gap-4 items-start">
                      <div className="w-28 h-28 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        {img ? (
                          <img src={img} alt={stationName} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Station</div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h2 className="text-lg font-semibold">{stationName} ({sc})</h2>
                            <div className="text-sm text-gray-500 mt-1">Arrival: {(st.arrival_time || st.arrival_time || "").slice(0,5) || "—"} • Day: {st.Day ?? "-"}</div>
                          </div>
                        </div>

                        <div className="mt-4">
                          {Array.isArray(st.vendors) && st.vendors.length ? (
                            <div className="space-y-3">
                              {st.vendors.map((r: any) => {
                                const restroCode = r.RestroCode ?? r.restroCode ?? r.id ?? r.restro_id ?? "";
                                const restroName = r.RestroName ?? r.restroName ?? r.name ?? "Vendor";
                                const minOrder = r.MinimumOrdermValue ?? r.minOrder ?? "—";
                                const openTime = r.OpenTime ?? r["0penTime"] ?? r.openTime ?? "—";
                                const closeTime = r.ClosedTime ?? r.closeTime ?? "—";
                                const restroImg = (r.RestroDisplayPhoto || (r.raw && r.raw.RestroDisplayPhoto) || null);

                                return (
                                  <article key={String(restroCode || restroName)} className="flex items-center gap-4 p-3 border rounded">
                                    <div className="w-28 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                      {restroImg ? (
                                        <img src={restroImg} alt={restroName} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
                                      )}
                                    </div>

                                    <div className="flex-1">
                                      <h3 className="font-semibold">{restroName}</h3>
                                      <div className="text-sm text-gray-600 mt-1">Min order: ₹{minOrder} • {openTime} - {closeTime}</div>
                                    </div>

                                    <div className="ml-4">
                                      <button
                                        onClick={() => goToStationRestro(st, r)}
                                        className="bg-green-600 text-white px-4 py-2 rounded"
                                      >
                                        Order Now
                                      </button>
                                    </div>
                                  </article>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-3 bg-gray-50 rounded text-sm text-gray-600">No active restaurants at this station.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })
            )}
          </div>
        )}
      </div>
    </main>
  );
}
