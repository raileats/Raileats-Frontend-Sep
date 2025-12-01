"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { makeStationSlug } from "../../lib/stationSlug";

type ApiRestro = {
  RestroCode?: number | string;
  RestroName?: string;
  MinimumOrdermValue?: number | null;
  OpenTime?: string | null;
  ClosedTime?: string | null;
  category?: string | null;
  rating?: number | null;
  [k: string]: any;
};

type ApiStation = {
  StnNumber?: number | null;
  StationCode: string;
  StationName: string;
  Day?: number | null;
  Arrives?: string | null;
  Departs?: string | null;
  arrivalTime?: string | null;
  restroCount?: number;
  restros?: ApiRestro[];
  minOrder?: number | null;
  index?: number;
};

type ApiTrainSearchResponse = {
  ok: boolean;
  train?: { trainNumber?: number | string; trainName?: string | null };
  rows?: any[];
  error?: string | null;
};

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

function addDaysToIso(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtHHMM(hhmm?: string | null) {
  if (!hhmm) return "";
  const s = String(hhmm).trim();
  if (!s) return "";
  return s.slice(0, 5);
}

// small concurrency helper to limit parallel admin calls
async function pMap<T, R>(
  items: T[],
  fn: (t: T) => Promise<R>,
  concurrency = 6,
) {
  const out: any[] = new Array(items.length);
  let idx = 0;
  const workers = new Array(concurrency).fill(null).map(async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) break;
      try {
        const res = await fn(items[i]);
        out[i] = res;
      } catch (e) {
        out[i] = null;
      }
    }
  });
  await Promise.all(workers);
  return out;
}

export default function TrainFoodPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = (params?.slug as string) || "";
  const trainNumberFromSlug = slug.split("-")[0];

  const queryDate = searchParams?.get("date") || "";
  const queryBoarding = searchParams?.get("boarding") || "";

  const shouldHideModal = Boolean(queryDate && queryBoarding);
  const [showModal, setShowModal] = useState<boolean>(() => !shouldHideModal);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (queryDate) return queryDate;
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  const [selectedBoardingCode, setSelectedBoardingCode] = useState<string | null>(() => {
    return queryBoarding || null;
  });

  const [data, setData] = useState<ApiTrainSearchResponse | null>(null);
  const [rows, setRows] = useState<ApiStation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [boardingDayValue, setBoardingDayValue] = useState<number | null>(null);

  // load route
  useEffect(() => {
    if (!trainNumberFromSlug) {
      setError("Invalid train number in URL.");
      setLoading(false);
      return;
    }

    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const url = `/api/train-routes?train=${encodeURIComponent(
          trainNumberFromSlug,
        )}&date=${encodeURIComponent(selectedDate)}`;

        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as ApiTrainSearchResponse;

        if (!res.ok || !json.ok) {
          setError(json.error || "Failed to load train details.");
          setData(null);
          setRows([]);
        } else {
          const routeRows = (json.rows || []) as any[];
          const stations = routeRows.map((r: any, i: number) => {
            const arrivalTime = (r.Arrives || r.Departs || "")?.slice(0, 5) || null;
            return {
              StnNumber: typeof r.StnNumber !== "undefined" ? Number(r.StnNumber) : undefined,
              StationCode: (r.StationCode || "").toUpperCase(),
              StationName: r.StationName || r.stationName || r.Station || r.station || "",
              Day: typeof r.Day !== "undefined" && r.Day !== null ? Number(r.Day) : null,
              Arrives: r.Arrives ?? null,
              Departs: r.Departs ?? null,
              arrivalTime,
              restroCount: (r as any).restroCount ?? 0,
              restros: (r as any).restros ?? [],
              minOrder: (r as any).minOrder ?? null,
              index: i,
            } as ApiStation;
          });

          if (!mounted) return;
          setData(json);
          setRows(stations);

          if (queryBoarding) {
            const found = stations.find((s) => (s.StationCode || "").toUpperCase() === (queryBoarding || "").toUpperCase());
            if (found && typeof found.Day === "number" && found.Day != null) {
              setBoardingDayValue(Number(found.Day));
            } else {
              setBoardingDayValue(null);
            }
          }
        }
      } catch (e) {
        console.error("train page fetch error", e);
        setError("Failed to load train details.");
        setData(null);
        setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [trainNumberFromSlug, selectedDate, queryBoarding]);

  // preselect first station if modal open
  useEffect(() => {
    if (!showModal && selectedBoardingCode) return;
    if (!rows || rows.length === 0) return;
    const first = rows[0];
    if (first) setSelectedBoardingCode((prev) => prev ?? first.StationCode);
  }, [rows, showModal, selectedBoardingCode]);

  // set boarding day value when boarding station chosen
  useEffect(() => {
    if (!selectedBoardingCode || !rows.length) {
      setBoardingDayValue(null);
      return;
    }
    const found = rows.find((s) => (s.StationCode || "").toUpperCase() === selectedBoardingCode.toUpperCase());
    if (found && typeof found.Day === "number" && found.Day != null) {
      setBoardingDayValue(Number(found.Day));
    } else {
      setBoardingDayValue(null);
    }
  }, [selectedBoardingCode, rows]);

  const filteredStations = useMemo(() => {
    if (!rows || !rows.length) return [];
    if (!selectedBoardingCode) return rows;
    const idx = rows.findIndex((s) => (s.StationCode || "").toUpperCase() === selectedBoardingCode.toUpperCase());
    if (idx === -1) return rows;
    return rows.slice(idx).map((s, i) => ({ ...s, index: idx + i }));
  }, [rows, selectedBoardingCode]);

  // fetch restaurants for filtered stations (concurrent, limited)
  useEffect(() => {
    if (!filteredStations.length) return;
    let mounted = true;
    const fetchForStations = async () => {
      const toFetch = filteredStations.map((s) => s.StationCode);
      const results = await pMap(
        toFetch,
        async (stationCode) => {
          try {
            const url = `${ADMIN_BASE.replace(/\/$/, "")}/api/stations/${encodeURIComponent(stationCode)}`;
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) return { stationCode, restros: [] as ApiRestro[] };
            const json = await res.json().catch(() => null);
            const restaurants: ApiRestro[] = (json?.restaurants ?? json?.rows ?? json?.data ?? []) as any[];
            return { stationCode, restros: restaurants || [] };
          } catch {
            return { stationCode, restros: [] as ApiRestro[] };
          }
        },
        6,
      );

      if (!mounted) return;

      setRows((prev) =>
        prev.map((r) => {
          const found = (results || []).find((x) => (x?.stationCode || "").toUpperCase() === (r.StationCode || "").toUpperCase());
          if (found) {
            return { ...r, restros: found.restros, restroCount: (found.restros || []).length };
          }
          return r;
        }),
      );
    };

    fetchForStations();
    return () => {
      mounted = false;
    };
  }, [filteredStations]);

  const trainTitleNumber = (data?.train?.trainNumber ?? trainNumberFromSlug) || "Train";
  const trainTitleName = data?.train?.trainName ? ` – ${data.train.trainName}` : "";

  const computeArrivalDateForStation = (station: ApiStation) => {
    if (typeof station.Day === "number" && boardingDayValue != null && !isNaN(Number(station.Day))) {
      const diff = Number(station.Day) - Number(boardingDayValue);
      return addDaysToIso(selectedDate, diff);
    }

    try {
      const full = rows || [];
      const boardingIndex = full.findIndex((s) => (s.StationCode || "").toUpperCase() === (selectedBoardingCode || "").toUpperCase());
      const stIndex = full.findIndex((s) => (s.StationCode || "").toUpperCase() === (station.StationCode || "").toUpperCase());
      if (boardingIndex !== -1 && stIndex !== -1) {
        const diff = stIndex - boardingIndex;
        const daysToAdd = diff < 0 ? diff + 1 : diff;
        return addDaysToIso(selectedDate, daysToAdd);
      }
    } catch {
      // ignore
    }

    return selectedDate;
  };

  const formatCurrency = (val?: number | null) => {
    if (val == null || Number.isNaN(Number(val))) return "-";
    return `₹${Number(val).toFixed(0)}`;
  };

  const handleModalSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedBoardingCode) {
      alert("Please select boarding station.");
      return;
    }
    setShowModal(false);
    const url = new URL(window.location.href);
    url.searchParams.set("date", selectedDate);
    url.searchParams.set("boarding", selectedBoardingCode);
    window.history.replaceState({}, "", url.toString());
  };

  const handleOrderNow = (restro: ApiRestro, station: ApiStation) => {
    const arrivalTime = station.arrivalTime ?? "";
    const arrivalDate = computeArrivalDateForStation(station);
    const qs = new URLSearchParams({
      station: station.StationCode,
      stationName: station.StationName || "",
      restro: String(restro?.RestroCode || restro?.restroCode || ""),
      restroName: String(restro?.RestroName || restro?.restro_name || ""),
      train: String(trainTitleNumber),
      date: arrivalDate,
      arrivalTime,
    }).toString();

    const stationSlug = makeStationSlug(station.StationCode, station.StationName || "");
    const restroSlug = `${restro?.RestroCode || ""}-${encodeURIComponent(String(restro?.RestroName || restro?.restro_name || "restaurant"))}`;

    router.push(`/Stations/${stationSlug}/${encodeURIComponent(restroSlug)}?${qs}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading train details…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-semibold mb-1">
          Train {trainTitleNumber}
          {trainTitleName}
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Food delivery stations & restaurants available on this train. Choose journey date and boarding station first.
        </p>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <form onSubmit={handleModalSubmit} className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6">
              <div className="mb-4">
                <div className="text-sm text-gray-500">Train</div>
                <div className="text-lg font-semibold">
                  {trainTitleNumber}
                  {trainTitleName}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Journey date</label>
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full border rounded px-3 py-2" required />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Boarding station</label>
                  <select value={selectedBoardingCode ?? ""} onChange={(e) => setSelectedBoardingCode(e.target.value)} className="w-full border rounded px-3 py-2" required>
                    <option value="" disabled>
                      Select boarding station
                    </option>
                    {(rows || []).map((s) => (
                      <option key={s.StationCode} value={s.StationCode}>
                        {s.StationName} ({s.StationCode}){s.Day ? ` — day ${s.Day}` : ""}
                      </option>
                    ))}
                  </select>

                  <div className="text-xs text-gray-500 mt-2">Dropdown shows full route from TrainRoute. Pick the station from where you'll board.</div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => (window.location.href = "/")} className="px-4 py-2 rounded border">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-green-600 text-white">Search & Open</button>
              </div>
            </form>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!error && (
          <>
            {(() => {
              const firstActive = (rows || []).find((r) => (r.restroCount || 0) > 0) ?? null;
              if (!firstActive) return null;
              return (
                <section className="mb-6 bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">
                        First active station: {firstActive.StationName} <span className="text-xs text-gray-500">({firstActive.StationCode})</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Arrival: {firstActive.arrivalTime ?? "-"} on {computeArrivalDateForStation(firstActive)}</div>
                    </div>
                    <div className="mt-3 md:mt-0 text-right text-xs text-gray-600">
                      <div>Active restaurants: <span className="font-semibold">{firstActive.restroCount}</span></div>
                      <div className="mt-1">Min. order: <span className="font-semibold">{formatCurrency(firstActive.minOrder)}</span></div>
                    </div>
                  </div>
                </section>
              );
            })()}
          </>
        )}

        {!error &&
          (filteredStations || []).map((st) => {
            const hasRestros = (st.restros || []).length > 0;
            const stationSlug = makeStationSlug(st.StationCode, st.StationName || "");
            const arrivalDateForThisStation = computeArrivalDateForStation(st);
            return (
              <section key={`${st.StationCode}-${st.Arrives}-${st.index}`} className="mt-6 bg-white rounded-lg shadow-sm border">
                <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3 border-b bg-gray-50">
                  <div>
                    <div className="text-sm font-semibold">
                      {st.StationName} <span className="text-xs text-gray-500">({st.StationCode})</span>
                      {st.Day ? <span className="text-xs text-gray-500"> — Day {st.Day}</span> : null}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Arrival: {st.arrivalTime ?? "-"} on {arrivalDateForThisStation}</div>
                  </div>

                  <div className="mt-2 md:mt-0 text-xs text-right text-gray-600">
                    <div>Active restaurants: <span className="font-semibold">{st.restroCount ?? (st.restros?.length ?? 0)}</span></div>
                    <div className="mt-1">
                      Min. order from <span className="font-semibold">{formatCurrency(st.minOrder ?? (st.restros?.[0]?.MinimumOrdermValue ?? null))}</span>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3">
                  {!hasRestros && <p className="text-xs text-gray-500">No active restaurants at this station for the selected train/date.</p>}

                  {hasRestros && (
                    <div className="space-y-3">
                      {st.restros!.map((r) => {
                        const restroSlug = `${r.RestroCode || ""}-${encodeURIComponent(String(r.RestroName || "restro"))}`;
                        return (
                          <div key={String(r.RestroCode || r.RestroName)} className="flex items-center justify-between border rounded-md px-3 py-3 hover:shadow-sm transition-shadow">
                            <div>
                              <div className="text-sm font-semibold">{r.RestroName}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                Open: {r.OpenTime ?? "—"} — {r.ClosedTime ?? "—"} • Min {formatCurrency(r.MinimumOrdermValue ?? st.minOrder)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Category: {r.category ?? "—"} • Rating: {r.rating ?? "—"}</div>
                              <div className="text-xs text-gray-500 mt-1">Delivery when train arrives: {st.arrivalTime ?? "-"} on {arrivalDateForThisStation}</div>
                            </div>

                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => handleOrderNow(r, st)} className="text-xs md:text-sm px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">
                                Order Now
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
      </main>
    </div>
  );
}
