"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { makeStationSlug } from "../../lib/stationSlug";

/* ---------------- types ---------------- */
type ApiRestro = {
  restroCode?: number | string;
  RestroCode?: number | string;
  restroName?: string;
  RestroName?: string;
  minimumOrder?: number | null;
  MinimumOrdermValue?: number | null;
  openTime?: string | null;
  OpenTime?: string | null;
  closeTime?: string | null;
  ClosedTime?: string | null;
  category?: "veg" | "non-veg" | "both" | string;
  rating?: number | null;
  RestroRating?: number | null;
  isActive?: boolean;
  Active?: boolean;
  id?: number | string;
  [k: string]: any;
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
  [k: string]: any;
};

type ApiTrainSearchResponse = {
  ok?: boolean;
  train?: {
    trainNumber?: number | string | null;
    trainName?: string | null;
    date?: string | null;
  };
  rows?: any[];
  stations?: any[];
  error?: string;
  [k: string]: any;
};

/* ---------------- helpers ---------------- */
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
  return String(hhmm).slice(0, 5);
}

function formatCurrency(val: number | null | undefined) {
  if (val == null || Number.isNaN(Number(val))) return "-";
  return `₹${Number(val).toFixed(0)}`;
}

function makeRestroSlug(code: string | number, name: string) {
  const cleanName = String(name || "restaurant")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${code}-${encodeURIComponent(cleanName)}`;
}

/* ---------------- admin fetch helpers (client) ---------------- */

/**
 * Fetch admin station restros (same endpoint used in Stations page).
 * Normalizes many field name variants.
 */
async function fetchStationAdminRestros(stationCode: string): Promise<ApiRestro[]> {
  try {
    const url = `${ADMIN_BASE.replace(/\/$/, "")}/api/stations/${encodeURIComponent(stationCode)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    // find candidate array (many shape variations)
    const arr: any[] = json?.restaurants ?? json?.restros ?? json?.rows ?? json?.data ?? (Array.isArray(json) ? json : []) ?? [];
    if (!Array.isArray(arr)) return [];
    return arr.map((e: any) => {
      return {
        restroCode:
          e?.restroCode ?? e?.RestroCode ?? e?.restro_code ?? e?.id ?? null,
        restroName:
          e?.restroName ?? e?.RestroName ?? e?.restro_name ?? e?.name ?? null,
        minimumOrder:
          e?.minimumOrder ?? e?.MinimumOrdermValue ?? e?.minimum_order ?? null,
        openTime:
          e?.openTime ?? e?.OpenTime ?? e?.open_time ?? null,
        closeTime:
          e?.closeTime ?? e?.ClosedTime ?? e?.close_time ?? null,
        rating: e?.rating ?? e?.RestroRating ?? null,
        isActive: typeof e?.Active === "boolean" ? e.Active : undefined,
        // keep raw so we can inspect later
        __raw: e,
      } as ApiRestro;
    });
  } catch {
    return [];
  }
}

/** check holidays for a restro */
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

/** Filter out outlets with an active holiday */
async function filterHolidayBlocked(restros: ApiRestro[]): Promise<ApiRestro[]> {
  if (!restros?.length) return [];
  const out: ApiRestro[] = [];
  const window = 6;
  for (let i = 0; i < restros.length; i += window) {
    const slice = restros.slice(i, i + window);
    const results = await Promise.all(slice.map((r) => isRestroOnHoliday(r.restroCode ?? r.RestroCode)));
    slice.forEach((r, idx) => {
      if (!results[idx]) out.push(r);
    });
  }
  return out;
}

/* ---------------- page component ---------------- */

export default function TrainFoodPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = (params?.slug as string) || "";
  const trainNumberFromSlug = slug.split("-")[0];

  const queryDate = searchParams?.get("date") || "";
  const queryBoarding = searchParams?.get("boarding") || "";

  const [apiResponse, setApiResponse] = useState<ApiTrainSearchResponse | null>(null);
  const [stations, setStations] = useState<ApiStation[] | null>(null);
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

  // debug & search UI
  const [showRaw, setShowRaw] = useState(false);
  const [searchCode, setSearchCode] = useState("");
  const [searchResultMsg, setSearchResultMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!trainNumberFromSlug) {
      setError("Invalid train number in URL.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setApiResponse(null);
      setStations(null);

      try {
        const url = `/api/train-routes?train=${encodeURIComponent(trainNumberFromSlug)}&date=${encodeURIComponent(
          selectedDate,
        )}${selectedBoardingCode ? `&boarding=${encodeURIComponent(selectedBoardingCode)}` : ""}`;

        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as ApiTrainSearchResponse;

        if (!res.ok || !json?.ok) {
          setError(json?.error || "Failed to load train details.");
          setApiResponse(json ?? null);
          setStations(null);
          return;
        }

        // rows may be under `rows` or `stations` or `data` etc.
        const rawRows: any[] = json.rows ?? json.stations ?? json.data ?? [];

        // normalize each row
        const normalized: ApiStation[] = rawRows.map((r: any, i: number) => {
          const arrivalTime = ((r?.Arrives || r?.Departs || r?.arrivalTime || "") as string).slice(0, 5) || r?.arrivalTime || null;
          const restrosFromRow: any[] = r?.restros ?? r?.restro ?? r?.restaurants ?? r?.Restros ?? r?.restaurants_list ?? [];
          const normalizedRestros: ApiRestro[] = (restrosFromRow || []).map((e: any) => {
            return {
              restroCode: e?.restroCode ?? e?.RestroCode ?? e?.restro_code ?? e?.id ?? null,
              restroName: e?.restroName ?? e?.RestroName ?? e?.restro_name ?? e?.name ?? null,
              minimumOrder: e?.minimumOrder ?? e?.MinimumOrdermValue ?? e?.minimum_order ?? null,
              openTime: e?.openTime ?? e?.OpenTime ?? e?.open_time ?? null,
              closeTime: e?.closeTime ?? e?.ClosedTime ?? e?.close_time ?? null,
              rating: e?.rating ?? e?.RestroRating ?? null,
              isActive: typeof e?.Active === "boolean" ? e.Active : undefined,
              __raw: e,
            } as ApiRestro;
          });

          return {
            StnNumber: r?.StnNumber ?? null,
            StationCode: String(r?.StationCode ?? r?.stationCode ?? "").toUpperCase(),
            StationName: r?.StationName ?? r?.Name ?? r?.stationName ?? "",
            Day: typeof r?.Day === "number" ? Number(r.Day) : r?.Day ? Number(r.Day) : null,
            Arrives: r?.Arrives ?? null,
            Departs: r?.Departs ?? null,
            arrivalTime,
            restroCount: r?.restroCount ?? (normalizedRestros ? normalizedRestros.length : 0),
            restros: normalizedRestros,
            index: i,
            arrivalDate: r?.arrivalDate ?? null,
            blockedReasons: r?.blockedReasons ?? r?.blocked_reasons ?? [],
            minOrder: r?.minOrder ?? null,
            __raw: r,
          } as ApiStation;
        });

        if (cancelled) return;

        setApiResponse(json);
        setStations(normalized);
      } catch (err) {
        console.error("train page fetch error", err);
        setError("Failed to load train details.");
        setApiResponse(null);
        setStations(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [trainNumberFromSlug, selectedDate, selectedBoardingCode]);

  // Enrich stations: if a station has no restros, fetch admin station restros
  useEffect(() => {
    let cancelled = false;
    async function enrich() {
      if (!stations || !stations.length) return;
      setLoading(true);
      try {
        const out: ApiStation[] = [];
        for (const st of stations) {
          // clone
          const copy: ApiStation = { ...st, restros: st.restros ? [...st.restros] : [] };
          if (!copy.restros || copy.restros.length === 0) {
            // call admin stations REST to get restros
            const adminRestros = await fetchStationAdminRestros(copy.StationCode);
            copy.restros = adminRestros.map((r) => ({
              restroCode: r.restroCode,
              restroName: r.restroName,
              minimumOrder: r.minimumOrder,
              openTime: r.openTime,
              closeTime: r.closeTime,
              rating: r.rating,
              isActive: r.isActive,
              __raw: r.__raw ?? r,
            }));
            copy.restroCount = copy.restros.length;
          }
          // filter out explicit inactive flag
          if (copy.restros && copy.restros.length > 0) {
            // drop restros that have isActive === false
            copy.restros = copy.restros.filter((r) => (typeof r.isActive === "boolean" ? !!r.isActive : true));
            // check holidays
            const filtered = await filterHolidayBlocked(copy.restros);
            copy.restros = filtered;
            copy.restroCount = filtered.length;
          }
          out.push(copy);
          if (cancelled) return;
        }
        if (!cancelled) setStations(out);
      } catch (err) {
        console.error("enrich error", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    enrich();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiResponse?.rows, stations && stations.map((s) => s.StationCode + ":" + (s.restroCount ?? 0)).join("|")]);

  // set boardingDayValue from fetched rows if boarding selected
  useEffect(() => {
    if (!stations || !stations.length) return;
    if (!selectedBoardingCode) {
      setBoardingDayValue(null);
      return;
    }
    const found = stations.find((s) => (s.StationCode || "").toUpperCase() === selectedBoardingCode.toUpperCase());
    if (found && typeof found.Day !== "undefined" && found.Day !== null) {
      setBoardingDayValue(Number(found.Day));
    } else {
      setBoardingDayValue(null);
    }
  }, [stations, selectedBoardingCode]);

  // when modal open, preselect first station if not set
  useEffect(() => {
    if (!showModal && selectedBoardingCode) return;
    if (!stations || stations.length === 0) return;
    const first = stations[0];
    if (first) {
      setSelectedBoardingCode((prev) => prev ?? first.StationCode);
    }
  }, [stations, showModal]);

  const filteredStations = useMemo(() => {
    if (!stations) return [];
    if (!selectedBoardingCode) return stations;
    const idx = stations.findIndex((s) => (s.StationCode || "").toUpperCase() === selectedBoardingCode.toUpperCase());
    if (idx === -1) return stations;
    return stations.slice(idx).map((s, i) => ({ ...s, index: idx + i }));
  }, [stations, selectedBoardingCode]);

  // stations that *have* restros server-side
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

  const trainTitleNumber = (apiResponse?.train?.trainNumber ?? trainNumberFromSlug) || "Train";
  const trainTitleName = apiResponse?.train?.trainName ? ` – ${apiResponse.train.trainName}` : "";

  function computeArrivalDateForStation(station: ApiStation) {
    if (station.arrivalDate) return station.arrivalDate;
    // fallback: if server didn't include arrivalDate, compute by Day offsets
    if (typeof station.Day === "number" && boardingDayValue != null) {
      const diff = Number(station.Day) - Number(boardingDayValue);
      return addDaysToIso(selectedDate, diff);
    }
    return station.arrivalDate ?? selectedDate;
  }

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
    // re-run effect because selectedBoardingCode is in deps
  };

  function handleOrderNow(restro: ApiRestro, station: ApiStation) {
    const arrivalTime = station.arrivalTime ?? "";
    const arrivalDate = computeArrivalDateForStation(station);
    const qs = new URLSearchParams({
      station: station.StationCode,
      stationName: station.StationName || "",
      restro: String(restro.restroCode ?? restro.RestroCode ?? restro.id ?? ""),
      restroName: String(restro.restroName ?? restro.RestroName ?? restro.name ?? ""),
      train: String(trainTitleNumber),
      date: arrivalDate,
      arrivalTime,
    }).toString();

    const stationSlug = makeStationSlug(station.StationCode, station.StationName || "");
    const restroSlug = makeRestroSlug(restro.restroCode ?? restro.RestroCode ?? restro.id ?? "", (restro.restroName ?? restro.RestroName ?? restro.name) || "restaurant");

    router.push(`/Stations/${stationSlug}/${restroSlug}?${qs}`);
  }

  function handleSearchSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!searchCode) {
      setSearchResultMsg("Please enter restro code to search.");
      return;
    }
    const t = String(searchCode).trim();
    const results: { station: string; restroName: string }[] = [];
    if (stations) {
      for (const s of stations) {
        const arr = s.restros ?? [];
        for (const r of arr) {
          if (String(r.restroCode ?? r.RestroCode ?? r.id) === t) {
            results.push({ station: `${s.StationName} (${s.StationCode})`, restroName: String(r.restroName ?? r.RestroName ?? r.name ?? "") });
          }
        }
      }
    }
    if (results.length === 0) {
      setSearchResultMsg(`No restro ${t} found in train-routes response.`);
      alert(`No restro ${t} found in train-routes response.`);
    } else {
      const msg = `Found ${results.length} match(es):\n` + results.map((r) => `${r.restroName} @ ${r.station}`).join("\n");
      setSearchResultMsg(msg);
      alert(`Found ${results.length} match(es):\n` + results.map((r) => `${r.restroName} @ ${r.station}`).join("\n"));
    }
  }

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

        {/* Controls top */}
        <div className="mb-4 p-3 bg-white rounded shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <label className="block text-xs text-gray-500">Journey date</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="border rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-xs text-gray-500">Boarding (station code)</label>
              <select value={selectedBoardingCode ?? ""} onChange={(e) => setSelectedBoardingCode(e.target.value)} className="border rounded px-2 py-1">
                <option value="">-- select boarding --</option>
                {(stations || []).map((s) => (
                  <option key={s.StationCode} value={s.StationCode}>
                    {s.StationName} ({s.StationCode}){s.Day ? ` — Day ${s.Day}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button onClick={handleModalSubmit} className="px-3 py-1 bg-green-600 text-white rounded">
                Apply
              </button>
              <button onClick={() => setShowRaw((s) => !s)} className="px-3 py-1 border rounded">
                Toggle raw rows
              </button>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <input placeholder="Search restro code" value={searchCode} onChange={(e) => setSearchCode(e.target.value)} className="border rounded px-2 py-1" />
              <button onClick={() => handleSearchSubmit()} className="px-3 py-1 bg-blue-600 text-white rounded">
                Search RestroCode
              </button>
            </div>
          </div>
          {searchResultMsg && <div className="mt-3 text-xs text-gray-600 whitespace-pre-wrap">{searchResultMsg}</div>}
        </div>

        {!firstActiveStation && !error && (
          <div className="p-4 bg-gray-50 rounded text-sm text-gray-700 mb-4">
            <p>No active restaurants found for the selected boarding station / date.</p>
            <ul className="mt-2 text-xs text-gray-600 space-y-1">
              <li>• No vendor mapped at station (server-side).</li>
              <li>• Vendor is closed / Weekly off on selected date.</li>
              <li>• Vendor on holiday or temporarily disabled.</li>
              <li>• Menu/outlet disabled by admin.</li>
              <li>• Server failed to fetch admin data (internal error).</li>
            </ul>
            <div className="mt-2 text-xs text-gray-500">
              Tip: open browser devtools → Network → filter `train-routes` to see server response & possible blockedReasons.
            </div>
          </div>
        )}

        {firstActiveStation && (
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

        {showRaw && (
          <div className="mb-4 bg-white p-3 rounded border overflow-auto max-h-64 text-xs">
            <pre>{JSON.stringify(stations || apiResponse?.rows || [], null, 2)}</pre>
          </div>
        )}

        {/* Render stations (boarding + onwards) */}
        {filteredStations.map((st) => {
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
                  {st.blockedReasons && st.blockedReasons.length ? (
                    <div className="text-xs text-rose-600 mt-1">Info: {st.blockedReasons.join("; ")}</div>
                  ) : null}
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
                {!hasRestros && (
                  <p className="text-xs text-gray-500">No active restaurants at this station for the selected train/date.</p>
                )}

                {hasRestros && (
                  <div className="space-y-3">
                    {st.restros!.map((r: any) => {
                      const restroSlug = makeRestroSlug(r.restroCode ?? r.RestroCode ?? r.id ?? "", r.restroName ?? r.RestroName ?? r.name ?? "Restaurant");
                      return (
                        <div key={String(r.restroCode ?? r.RestroCode ?? r.id)} className="flex items-center justify-between border rounded-md px-3 py-3 hover:shadow-sm transition-shadow">
                          <div>
                            <div className="text-sm font-semibold">{r.restroName ?? r.RestroName ?? r.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Open: {r.openTime ?? r.OpenTime ?? "—"} — {r.closeTime ?? r.ClosedTime ?? "—"} • Min {formatCurrency(r.minimumOrder ?? st.minOrder)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Delivery when train arrives: {st.arrivalTime ?? "-"} on {arrivalDateForThisStation}
                            </div>
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
