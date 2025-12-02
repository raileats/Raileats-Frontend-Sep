"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { makeStationSlug } from "../../lib/stationSlug";

/* ---------------- types ---------------- */
type ApiRestro = {
  restroCode: number | string;
  restroName: string;
  minimumOrder?: number | null;
  openTime?: string | null;
  closeTime?: string | null;
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
  restros?: ApiRestro[];
  index?: number;
  arrivalDate?: string | null;
  blockedReasons?: string[];
  minOrder?: number | null;
};

type ApiTrainSearchResponse = {
  ok: boolean;
  train?: {
    trainNumber: number | string | null;
    trainName: string | null;
    date?: string | null;
  };
  rows?: ApiStation[];
  error?: string;
};

/* ---------------- constants/helpers ---------------- */
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

function formatCurrency(val?: number | null) {
  if (val == null || Number.isNaN(Number(val))) return "-";
  return `₹${Number(val).toFixed(0)}`;
}

/* fetch helpers for admin data (used to merge missing restros) */
async function fetchStationAdminRestros(stationCode: string): Promise<ApiRestro[]> {
  try {
    const url = `${ADMIN_BASE.replace(/\/$/, "")}/api/stations/${encodeURIComponent(stationCode)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    // admin returns object with .restaurants || .restros etc — normalize
    const arr: any[] = json?.restaurants ?? json?.restros ?? json?.rows ?? [];
    return (arr || []).map((r: any) => ({
      restroCode: r.RestroCode ?? r.restro_code ?? r.id ?? r.restroCode,
      restroName: r.RestroName ?? r.restro_name ?? r.name ?? r.restroName,
      minimumOrder: r.MinimumOrdermValue ?? r.minimum_order ?? r.minimumOrder ?? null,
      openTime: r.OpenTime ?? r.open_time ?? r.openTime ?? null,
      closeTime: r.ClosedTime ?? r.close_time ?? r.closedTime ?? null,
      rating: r.RestroRating ?? r.rating ?? null,
      isActive: typeof r.Active !== "undefined" ? Boolean(r.Active) : undefined,
    })) as ApiRestro[];
  } catch {
    return [];
  }
}

/* holiday check for a restro (admin API) */
async function isRestroOnHoliday(restroCode: string | number) {
  try {
    const url = `${ADMIN_BASE.replace(/\/$/, "")}/api/restros/${encodeURIComponent(String(restroCode))}/holidays`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return false;
    const j = await res.json().catch(() => null);
    const rows: any[] = j?.rows ?? j?.data ?? (Array.isArray(j) ? j : []);
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

/* batch filter out holiday restros */
async function filterHolidayBlocked(restros: ApiRestro[]) {
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

/* ---------------- component ---------------- */
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(() => queryDate || new Date().toISOString().slice(0, 10));
  const [selectedBoardingCode, setSelectedBoardingCode] = useState<string | null>(() => queryBoarding || null);
  const [boardingDayValue, setBoardingDayValue] = useState<number | null>(null);

  // debug UI
  const [showRaw, setShowRaw] = useState(false);
  const [searchRestroCode, setSearchRestroCode] = useState("");
  const [debugMessage, setDebugMessage] = useState<string | null>(null);

  // load train route rows
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
      setRows(null);
      try {
        const url = `/api/train-routes?train=${encodeURIComponent(trainNumberFromSlug)}&date=${encodeURIComponent(
          selectedDate,
        )}${selectedBoardingCode ? `&boarding=${encodeURIComponent(selectedBoardingCode)}` : ""}`;

        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json().catch(() => ({} as any))) as ApiTrainSearchResponse;

        if (!res.ok || !json.ok) {
          setError(json.error || "Failed to load train details.");
          setData(null);
          setRows(null);
          setLoading(false);
          return;
        }

        // rows might be in json.rows (or json.stations etc) — normalize
        const rawRows: any[] = json.rows ?? (json as any).stations ?? [];

        // ensure each row has StationCode upper-case & restros array
        const normalized: ApiStation[] = rawRows.map((r: any, i: number) => {
          const arrivalTime = (r.Arrives || r.Departs || r.arrivalTime || "").slice(0, 5) || null;
          return {
            StnNumber: r.StnNumber ?? null,
            StationCode: String(r.StationCode || "").toUpperCase(),
            StationName: r.StationName ?? r.Name ?? "",
            Day: typeof r.Day === "number" ? Number(r.Day) : r.Day ? Number(r.Day) : null,
            Arrives: r.Arrives ?? null,
            Departs: r.Departs ?? null,
            arrivalTime,
            restroCount: r.restroCount ?? (r.restros ? r.restros.length : 0),
            restros: r.restros
              ? (r.restros.map((x: any) => ({
                  restroCode: x.restroCode ?? x.RestroCode ?? x.id ?? x.restro_code,
                  restroName: x.restroName ?? x.RestroName ?? x.name ?? x.restro_name,
                  minimumOrder: x.minimumOrder ?? x.MinimumOrdermValue ?? x.minimum_order ?? null,
                  openTime: x.openTime ?? x.OpenTime ?? x.open_time ?? null,
                  closeTime: x.closeTime ?? x.ClosedTime ?? x.close_time ?? null,
                  rating: x.rating ?? x.RestroRating ?? null,
                })) as ApiRestro[])
              : [],
            index: i,
            arrivalDate: r.arrivalDate ?? null,
            blockedReasons: r.blockedReasons ?? [],
            minOrder: r.minOrder ?? null,
          } as ApiStation;
        });

        if (cancelled) return;

        setData(json);
        setRows(normalized);
      } catch (e: any) {
        console.error("fetch train-routes error", e);
        setError("Failed to load train details.");
        setData(null);
        setRows(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [trainNumberFromSlug, selectedDate, selectedBoardingCode]);

  // when we have rows, ensure restros from admin are merged when missing
  useEffect(() => {
    let cancelled = false;
    async function enrich() {
      if (!rows || rows.length === 0) return;
      setLoading(true);
      try {
        const merged: ApiStation[] = [];
        for (const r of rows) {
          const stationCopy: ApiStation = { ...r, restros: r.restros ? [...r.restros] : [] };

          // if server didn't send any restros for this station, try admin endpoint to fetch mapped restros
          if ((!stationCopy.restros || stationCopy.restros.length === 0)) {
            const adminRestros = await fetchStationAdminRestros(stationCopy.StationCode);
            // normalize admin restros to ApiRestro
            stationCopy.restros = adminRestros as ApiRestro[];
            stationCopy.restroCount = stationCopy.restros.length;
          } else {
            // server provided restros; still may need to normalize keys if they differ
            stationCopy.restros = (stationCopy.restros || []).map((x: any) => ({
              restroCode: x.restroCode ?? x.RestroCode ?? x.id ?? x.restro_code,
              restroName: x.restroName ?? x.RestroName ?? x.name ?? x.restro_name,
              minimumOrder: x.minimumOrder ?? x.MinimumOrdermValue ?? x.minimum_order ?? null,
              openTime: x.openTime ?? x.OpenTime ?? x.open_time ?? null,
              closeTime: x.closeTime ?? x.ClosedTime ?? x.close_time ?? null,
              rating: x.rating ?? x.RestroRating ?? null,
            })) as ApiRestro[];
            stationCopy.restroCount = stationCopy.restros.length;
          }

          // filter holiday blocked restros for final displayed list
          if (stationCopy.restros && stationCopy.restros.length > 0) {
            const allowed = await filterHolidayBlocked(stationCopy.restros);
            stationCopy.restros = allowed;
            stationCopy.restroCount = allowed.length;
          }

          merged.push(stationCopy);
          if (cancelled) return;
        }

        if (!cancelled) setRows(merged);
      } catch (e) {
        console.error("enrich error", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    enrich();
    return () => {
      cancelled = true;
    };
  }, [rows && rows.map((r) => r.StationCode).join(","), /* re-run when rows change */]);

  // compute boardingDayValue from rows if boarding selected
  useEffect(() => {
    if (!rows || rows.length === 0) {
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

  // filtered stations from boarding onwards
  const filteredStations = useMemo(() => {
    if (!rows) return [];
    if (!selectedBoardingCode) return rows;
    const idx = rows.findIndex((s) => (s.StationCode || "").toUpperCase() === selectedBoardingCode.toUpperCase());
    if (idx === -1) return rows;
    return rows.slice(idx).map((s, i) => ({ ...s, index: idx + i }));
  }, [rows, selectedBoardingCode]);

  const stationsWithActiveRestros = useMemo(() => {
    return filteredStations
      .map((s) => ({ ...s, restros: s.restros || [], restroCount: s.restroCount ?? (s.restros ? s.restros.length : 0) }))
      .filter((s) => (s.restros || []).length > 0);
  }, [filteredStations]);

  const firstActiveStation = stationsWithActiveRestros.length ? stationsWithActiveRestros[0] : null;

  const trainTitleNumber = (data?.train?.trainNumber ?? trainNumberFromSlug) || "Train";
  const trainTitleName = data?.train?.trainName ? ` – ${data!.train!.trainName}` : "";

  function computeArrivalDateForStation(station: ApiStation) {
    if (station.arrivalDate) return station.arrivalDate;
    if (typeof station.Day === "number" && boardingDayValue != null) {
      const diff = Number(station.Day) - Number(boardingDayValue);
      return addDaysToIso(selectedDate, diff);
    }
    return selectedDate;
  }

  function handleSearchSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!searchRestroCode) {
      setDebugMessage("Please enter restro code to search.");
      return;
    }
    const cStr = String(searchRestroCode).trim();
    // search in rows
    const foundList: { station: string; restro: ApiRestro }[] = [];
    if (rows) {
      for (const row of rows) {
        const arr = row.restros ?? [];
        for (const r of arr) {
          if (String(r.restroCode) === cStr) {
            foundList.push({ station: `${row.StationName} (${row.StationCode})`, restro: r });
          }
        }
      }
    }
    if (foundList.length === 0) {
      // also try admin-station mapping (quick check)
      setDebugMessage(`No restro ${cStr} found in train-routes response.`);
      alert(`No restro ${cStr} found in train-routes response.`);
    } else {
      const byStations = foundList.map((f) => `${f.restro.restroName} @ ${f.station}`).join("\n");
      setDebugMessage(`Found ${foundList.length} match(es):\n${byStations}`);
      alert(`Found ${foundList.length} match(es):\n${byStations}`);
    }
  }

  function handleModalSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    // persist query params to URL
    if (!selectedBoardingCode) {
      alert("Please select boarding station.");
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("date", selectedDate);
    url.searchParams.set("boarding", selectedBoardingCode);
    window.history.replaceState({}, "", url.toString());
    // trigger re-fetch by updating state (selectedBoardingCode already stored)
    // no further action needed because useEffect depends on selectedBoardingCode & selectedDate
  }

  function handleOrderNow(restro: ApiRestro, station: ApiStation) {
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
    const restroSlug = `${restro.restroCode}-${encodeURIComponent(String(restro.restroName || "Restaurant").toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`;

    router.push(`/Stations/${stationSlug}/${restroSlug}?${qs}`);
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

        {/* Controls / debug */}
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
                {(rows || []).map((s) => (
                  <option key={s.StationCode} value={s.StationCode}>
                    {s.StationName} ({s.StationCode}){s.Day ? ` — Day ${s.Day}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button onClick={handleModalSubmit} className="px-3 py-1 bg-green-600 text-white rounded">Apply</button>
              <button onClick={() => { setShowRaw((v) => !v); }} className="px-3 py-1 border rounded">Toggle raw rows</button>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <input placeholder="Search restro code" value={searchRestroCode} onChange={(e) => setSearchRestroCode(e.target.value)} className="border rounded px-2 py-1" />
              <button onClick={() => handleSearchSubmit()} className="px-3 py-1 bg-blue-600 text-white rounded">Search RestroCode</button>
            </div>
          </div>

          {debugMessage && <div className="mt-3 text-xs text-gray-600 whitespace-pre-wrap">{debugMessage}</div>}
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
                <div>Active restaurants: <span className="font-semibold">{firstActiveStation.restroCount}</span></div>
                <div className="mt-1">Min. order: <span className="font-semibold">{formatCurrency(firstActiveStation.minOrder ?? undefined)}</span></div>
              </div>
            </div>
          </section>
        )}

        {/* Raw rows debugging */}
        {showRaw && (
          <div className="mb-4 bg-white p-3 rounded border overflow-auto max-h-64 text-xs">
            <pre>{JSON.stringify(rows || [], null, 2)}</pre>
          </div>
        )}

        {/* Station list from boarding onwards */}
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
                  <div>Active restaurants: <span className="font-semibold">{st.restroCount ?? (st.restros?.length ?? 0)}</span></div>
                  <div className="mt-1">Min. order from <span className="font-semibold">{formatCurrency(st.minOrder ?? st.restros?.[0]?.minimumOrder ?? null)}</span></div>
                </div>
              </div>

              <div className="px-4 py-3">
                {!hasRestros && (
                  <p className="text-xs text-gray-500">No active restaurants at this station for the selected train/date.</p>
                )}

                {hasRestros && (
                  <div className="space-y-3">
                    {st.restros!.map((r: any) => {
                      return (
                        <div key={String(r.restroCode)} className="flex items-center justify-between border rounded-md px-3 py-3 hover:shadow-sm transition-shadow">
                          <div>
                            <div className="text-sm font-semibold">{r.restroName}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Open: {r.openTime ?? "—"} — {r.closeTime ?? "—"} • Min {formatCurrency(r.minimumOrder ?? st.minOrder ?? null)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Delivery when train arrives: {st.arrivalTime ?? "-"} on {arrivalDateForThisStation}</div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button onClick={() => handleOrderNow(r, st)} className="text-xs md:text-sm px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">Order Now</button>
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
