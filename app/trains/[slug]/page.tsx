// app/trains/[slug]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { makeStationSlug } from "../../lib/stationSlug";

type ApiRestro = {
  // these are the normalized fields we use in the UI
  restroCode: number | string;
  restroName: string;
  minimumOrder?: number | null;
  openTime?: string | null;
  closeTime?: string | null;
  category?: "veg" | "non-veg" | "both" | string;
  rating?: number | null;
  isActive?: boolean;
};

type ApiStation = {
  StnNumber?: number | null;
  StationCode: string;
  StationName: string;
  Day?: number | null;
  arrivalTime?: string | null;
  Arrives?: string | null;
  Departs?: string | null;
  restroCount?: number;
  minOrder?: number | null;
  restros?: ApiRestro[];
  index?: number;
  arrivalDate?: string | null;
  blockedReasons?: string[];
};

type ApiTrainSearchResponse = {
  ok: boolean;
  train?: {
    trainNumber: number | string | null;
    trainName: string | null;
    date?: string | null;
  };
  rows?: any[]; // server shapes vary
  meta?: any;
  error?: string;
};

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
  return String(hhmm).slice(0, 5);
}

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

/** fetch train-routes */
async function fetchTrainRoutes(train: string, date: string) {
  const url = `/api/train-routes?train=${encodeURIComponent(train)}&date=${encodeURIComponent(date)}`;
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Failed to load train routes: ${resp.status} ${txt}`);
  }
  const json = (await resp.json()) as ApiTrainSearchResponse;
  return json;
}

/** fetch restros for a station from admin endpoint (multiple possible shapes) */
async function fetchStationAdminRestros(code: string): Promise<ApiRestro[]> {
  try {
    const url = `${ADMIN_BASE.replace(/\/$/, "")}/api/stations/${encodeURIComponent(code)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    const arr: any[] = json?.restaurants ?? json?.restros ?? json?.rows ?? (Array.isArray(json) ? json : []);
    if (!Array.isArray(arr)) return [];
    return arr.map((e: any) => normalizeRestroFromAny(e));
  } catch {
    return [];
  }
}

/** normalize restro object from any shape into ApiRestro */
function normalizeRestroFromAny(e: any): ApiRestro {
  // be liberal: accept RestroCode, restroCode, id, restro_code
  const restroCode = e?.restroCode ?? e?.RestroCode ?? e?.id ?? e?.restro_code;
  const restroName = e?.restroName ?? e?.RestroName ?? e?.name ?? e?.restro_name ?? "";
  const minimumOrder = e?.minimumOrder ?? e?.MinimumOrdermValue ?? e?.minimum_order ?? null;
  const openTime = e?.openTime ?? e?.OpenTime ?? e?.open_time ?? null;
  const closeTime = e?.closeTime ?? e?.ClosedTime ?? e?.close_time ?? null;
  const rating = e?.rating ?? e?.RestroRating ?? null;
  const isActive = typeof e?.Active !== "undefined" ? !!e.Active : typeof e?.isActive !== "undefined" ? !!e.isActive : undefined;

  return {
    restroCode,
    restroName,
    minimumOrder,
    openTime,
    closeTime,
    rating,
    isActive,
  } as ApiRestro;
}

/** holiday checker for single restro (server-side) */
async function isRestroOnHoliday(restroCode: string | number): Promise<boolean> {
  try {
    const url = `${ADMIN_BASE.replace(/\/$/, "")}/api/restros/${encodeURIComponent(String(restroCode))}/holidays`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return false;
    const json = await res.json().catch(() => null);
    const rows: any[] = json?.rows ?? json?.data ?? (Array.isArray(json) ? json : []);
    if (!Array.isArray(rows) || rows.length === 0) return false;
    const now = Date.now();
    for (const r of rows) {
      if (r?.deleted_at) continue;
      const start = r?.start_at ? Date.parse(r.start_at) : NaN;
      const end = r?.end_at ? Date.parse(r.end_at) : NaN;
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      if (start <= now && now <= end) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Filter out outlets with an active holiday (batched) */
async function filterHolidayBlocked(restros: ApiRestro[]): Promise<ApiRestro[]> {
  if (!restros?.length) return [];
  const out: ApiRestro[] = [];
  const window = 6;
  for (let i = 0; i < restros.length; i += window) {
    const slice = restros.slice(i, i + window);
    const results = await Promise.all(slice.map((r) => isRestroOnHoliday(r.restroCode)));
    slice.forEach((r, idx) => {
      if (!results[idx]) out.push(r);
    });
  }
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

  const [data, setData] = useState<ApiTrainSearchResponse | null>(null);
  const [rows, setRows] = useState<ApiStation[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  const [boardingDayValue, setBoardingDayValue] = useState<number | null>(null);
  const [showRaw, setShowRaw] = useState<boolean>(false);
  const [searchRestroCode, setSearchRestroCode] = useState<string>("");

  // main fetch effect
  useEffect(() => {
    if (!trainNumberFromSlug) {
      setError("Invalid train number in URL.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const url = `/api/train-routes?train=${encodeURIComponent(trainNumberFromSlug)}&date=${encodeURIComponent(selectedDate)}${selectedBoardingCode ? `&boarding=${encodeURIComponent(selectedBoardingCode)}` : ""}`;
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as ApiTrainSearchResponse;

        if (!res.ok || !json.ok) {
          setError(json.error || "Failed to load train details.");
          setData(null);
          setRows(null);
        } else {
          const rawRows: any[] = (json.rows || []) as any[];

          // normalize server rows into ApiStation
          const stations: ApiStation[] = rawRows.map((r: any, i: number) => {
            // r may have Arrives/Departs/arrivalTime fields; pick best available
            const arrivalTime = (r.Arrives || r.Departs || "")?.slice?.(0, 5) || r.arrivalTime || null;
            // if restros exist on the row, normalize them to ApiRestro
            const restrosRaw: any[] = r.restros ?? r.restro_list ?? r.restaurants ?? [];
            const restrosNorm: ApiRestro[] = Array.isArray(restrosRaw)
              ? restrosRaw.map((rr: any) => normalizeRestroFromAny(rr))
              : [];

            const minOrder = r.minOrder ?? null;

            return {
              StnNumber: r.StnNumber ?? null,
              StationCode: String(r.StationCode || "").toUpperCase(),
              StationName: r.StationName ?? r.Name ?? "",
              Day: typeof r.Day === "number" ? Number(r.Day) : r.Day ? Number(r.Day) : null,
              Arrives: r.Arrives ?? null,
              Departs: r.Departs ?? null,
              arrivalTime,
              restroCount: r.restroCount ?? (restrosNorm ? restrosNorm.length : 0),
              restros: restrosNorm,
              index: i,
              arrivalDate: r.arrivalDate ?? null,
              blockedReasons: r.blockedReasons ?? [],
              minOrder,
            } as ApiStation;
          });

          if (cancelled) return;
          setData(json);
          setRows(stations);
        }
      } catch (e) {
        console.error("train page fetch error", e);
        setError("Failed to load train details.");
        setData(null);
        setRows(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [trainNumberFromSlug, selectedDate, selectedBoardingCode]);

  // set boardingDayValue from fetched rows if boarding selected
  useEffect(() => {
    if (!rows || !rows.length) {
      setBoardingDayValue(null);
      return;
    }
    if (!selectedBoardingCode) {
      setBoardingDayValue(null);
      return;
    }
    const found = rows.find((s) => (s.StationCode || "").toUpperCase() === selectedBoardingCode.toUpperCase());
    if (found && typeof found.Day !== "undefined" && found.Day !== null) {
      setBoardingDayValue(Number(found.Day));
    } else {
      setBoardingDayValue(null);
    }
  }, [rows, selectedBoardingCode]);

  // when modal open, preselect first station if not set
  useEffect(() => {
    if (!showModal && selectedBoardingCode) return;
    if (!rows || rows.length === 0) return;
    const first = rows[0];
    if (first) {
      setSelectedBoardingCode((prev) => prev ?? first.StationCode);
    }
  }, [rows, showModal, selectedBoardingCode]);

  // slice filteredStations from boarding
  const filteredStations = useMemo(() => {
    if (!rows) return [];
    if (!selectedBoardingCode) return rows;
    const idx = rows.findIndex((s) => (s.StationCode || "").toUpperCase() === selectedBoardingCode.toUpperCase());
    if (idx === -1) return rows;
    return rows.slice(idx).map((s, i) => ({ ...s, index: idx + i }));
  }, [rows, selectedBoardingCode]);

  // For each station in filteredStations ensure we have restros: if row.restros present use them, else fallback to admin endpoint.
  // We'll enrich them on demand — but for simplicity here we fetch admin restros for stations that don't have restros in the row.
  useEffect(() => {
    let cancelled = false;
    const enrich = async () => {
      if (!filteredStations || filteredStations.length === 0) return;
      setLoading(true);
      try {
        const updated: ApiStation[] = [];
        for (const st of filteredStations) {
          let restros = st.restros ?? [];
          if ((!restros || restros.length === 0) && st.StationCode) {
            try {
              restros = await fetchStationAdminRestros(st.StationCode);
            } catch {
              restros = [];
            }
          }
          // filter holidays
          const active = await filterHolidayBlocked(restros);
          updated.push({ ...st, restros: active, restroCount: active.length });
          if (cancelled) return;
        }
        if (!cancelled) {
          // replace rows with updated slice in state (so UI shows min order & counts)
          setRows((prev) => {
            if (!prev) return updated;
            // create new rows where slice matches station code
            const mapByCode = new Map(updated.map((u) => [u.StationCode, u]));
            return prev.map((r) => mapByCode.has(r.StationCode) ? (mapByCode.get(r.StationCode) as ApiStation) : r);
          });
        }
      } catch (e) {
        console.error("enrich error", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    enrich();
    return () => {
      cancelled = true;
    };
  }, [filteredStations.map((s) => s.StationCode).join(",")]); // eslint-disable-line

  const formatCurrency = (val: number | null | undefined) => {
    if (val == null || Number.isNaN(Number(val))) return "-";
    return `₹${Number(val).toFixed(0)}`;
  };

  const makeRestroSlug = (code: string | number, name: string) => {
    const cleanName = name
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    return `${code}-${encodeURIComponent(cleanName)}`;
  };

  const stationsWithActiveRestros = useMemo(() => {
    return filteredStations
      .map((s) => ({
        ...s,
        restros: s.restros || [],
        restroCount: s.restroCount ?? (s.restros ? s.restros.length : 0),
      }))
      .filter((s) => (s.restros || []).length > 0);
  }, [filteredStations]);

  const firstActiveStation = stationsWithActiveRestros.length > 0 ? stationsWithActiveRestros[0] : null;

  const trainTitleNumber = (data?.train?.trainNumber ?? trainNumberFromSlug) || "Train";
  const trainTitleName = data?.train?.trainName ? ` – ${data.train.trainName}` : "";

  const computeArrivalDateForStation = (station: ApiStation) => {
    if (station.arrivalDate) return station.arrivalDate;
    // fallback: if server didn't include arrivalDate, compute by Day offsets
    if (typeof station.Day === "number" && boardingDayValue != null) {
      const diff = Number(station.Day) - Number(boardingDayValue);
      return addDaysToIso(selectedDate, diff);
    }
    return station.arrivalDate ?? selectedDate;
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
    // re-fetch happens because selectedBoardingCode/selectedDate are dependencies
  };

  const handleOrderNow = (restro: ApiRestro, station: ApiStation) => {
    const arrivalTime = station.arrivalTime ?? "";
    const arrivalDate = computeArrivalDateForStation(station);
    const qs = new URLSearchParams({
      station: station.StationCode,
      stationName: station.StationName || "",
      restro: String(restro.restroCode),
      restroName: String(restro.restroName || ""),
      train: String(trainTitleNumber),
      date: arrivalDate,
      arrivalTime,
    }).toString();

    const stationSlug = makeStationSlug(station.StationCode, station.StationName || "");
    const restroSlug = makeRestroSlug(restro.restroCode, restro.restroName);
    router.push(`/Stations/${stationSlug}/${restroSlug}?${qs}`);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchRestroCode.trim()) {
      alert("Please enter restro code to search.");
      return;
    }
    const t = String(searchRestroCode).trim();
    const matches: { station: string; restro: ApiRestro }[] = [];
    if (filteredStations) {
      for (const s of filteredStations) {
        const list = s.restros ?? [];
        for (const r of list) {
          if (String(r.restroCode) === t) matches.push({ station: `${s.StationName} (${s.StationCode})`, restro: r });
        }
      }
    }
    if (matches.length === 0) {
      alert(`No restro ${t} found in train-routes response.`);
    } else {
      alert(`Found ${matches.length} match(es):\n` + matches.map((m) => `${m.restro.restroName} @ ${m.station}`).join("\n"));
    }
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
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Boarding station</label>
                  <select
                    value={selectedBoardingCode ?? ""}
                    onChange={(e) => setSelectedBoardingCode(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="" disabled>
                      Select boarding station
                    </option>
                    {(rows || []).map((s: any) => (
                      <option key={s.StationCode} value={s.StationCode}>
                        {s.StationName} ({s.StationCode}) {s.Day ? ` — Day ${s.Day}` : ""}
                      </option>
                    ))}
                  </select>

                  <div className="text-xs text-gray-500 mt-2">
                    Dropdown shows full route from TrainRoute. Pick the station from where you'll board.
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/";
                  }}
                  className="px-4 py-2 rounded border"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded bg-green-600 text-white">
                  Search & Open
                </button>
              </div>
            </form>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!error && !firstActiveStation && !loading && (
          <div className="p-4 bg-gray-50 rounded text-sm text-gray-700">
            <p>No active restaurants found for the selected boarding station / date.</p>
            <ul className="mt-2 text-xs text-gray-600 space-y-1">
              <li>• No vendor mapped at station (server-side).</li>
              <li>• Vendor is closed / Weekly off on selected date.</li>
              <li>• Vendor on holiday or temporarily disabled.</li>
              <li>• Menu/outlet disabled by admin.</li>
              <li>• Server failed to fetch admin data (internal error).</li>
            </ul>
            <div className="mt-2 text-xs text-gray-500">Tip: open browser devtools → Network → filter `train-routes` to see server response & possible blockedReasons.</div>
          </div>
        )}

        {!error && firstActiveStation && (
          <section className="mb-6 bg-white rounded-lg shadow-sm border p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <div className="text-sm font-semibold">
                  First active station: {firstActiveStation.StationName} <span className="text-xs text-gray-500">({firstActiveStation.StationCode})</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Arrival: {firstActiveStation.arrivalTime ?? "-"} on {computeArrivalDateForStation(firstActiveStation)}
                </div>
              </div>

              <div className="mt-3 md:mt-0 text-right text-xs text-gray-600">
                <div>
                  Active restaurants: <span className="font-semibold">{firstActiveStation.restroCount}</span>
                </div>
                <div className="mt-1">
                  Min. order: <span className="font-semibold">{formatCurrency(firstActiveStation.minOrder)}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="mb-4 p-3 bg-white rounded shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <label className="block text-xs text-gray-500">Search restro code</label>
              <input value={searchRestroCode} onChange={(e) => setSearchRestroCode(e.target.value)} placeholder="1004" className="border rounded px-2 py-1" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={() => handleSearchSubmit()} className="px-3 py-1 bg-blue-600 text-white rounded">
                Search RestroCode
              </button>
              <button onClick={() => setShowRaw((s) => !s)} className="px-3 py-1 border rounded">
                Toggle raw rows
              </button>
            </div>
          </div>
        </div>

        {showRaw && rows && (
          <div className="mb-4 bg-white p-3 rounded border overflow-auto max-h-64 text-xs">
            <pre>{JSON.stringify(rows, null, 2)}</pre>
          </div>
        )}

        {!error &&
          filteredStations.map((st) => {
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
                    <div className="text-xs text-gray-500 mt-1">
                      Arrival: {st.arrivalTime ?? "-"} on {arrivalDateForThisStation}
                    </div>
                    {st.blockedReasons && st.blockedReasons.length ? <div className="text-xs text-rose-600 mt-1">Info: {st.blockedReasons.join("; ")}</div> : null}
                  </div>

                  <div className="mt-2 md:mt-0 text-xs text-right text-gray-600">
                    <div>
                      Active restaurants: <span className="font-semibold">{st.restroCount ?? (st.restros?.length ?? 0)}</span>
                    </div>
                    <div className="mt-1">
                      Min. order from{" "}
                      <span className="font-semibold">
                        {formatCurrency(st.minOrder ?? (st.restros?.[0]?.minimumOrder ?? null))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3">
                  {!hasRestros && <p className="text-xs text-gray-500">No active restaurants at this station for the selected train/date.</p>}

                  {hasRestros && (
                    <div className="space-y-3">
                      {st.restros!.map((r: any) => {
                        // r should be normalized ApiRestro; cast to be safe
                        const rr = r as ApiRestro;
                        const restroSlug = makeRestroSlug(rr.restroCode, rr.restroName);
                        return (
                          <div key={String(rr.restroCode)} className="flex items-center justify-between border rounded-md px-3 py-3 hover:shadow-sm transition-shadow">
                            <div>
                              <div className="text-sm font-semibold">{rr.restroName}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                Open: {rr.openTime ?? "—"} — {rr.closeTime ?? "—"} • Min {formatCurrency(rr.minimumOrder ?? st.minOrder)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Delivery when train arrives: {st.arrivalTime ?? "-"} on {arrivalDateForThisStation}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => handleOrderNow(rr, st)} className="text-xs md:text-sm px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">
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
