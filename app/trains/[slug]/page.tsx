// app/trains/[slug]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { makeStationSlug } from "../../lib/stationSlug";

type ApiRestroFromAdmin = {
  RestroCode?: string | number;
  restroCode?: string | number; // admin may use either
  RestroName?: string;
  restroName?: string;
  MinimumOrdermValue?: number | null;
  minimumOrder?: number | null;
  OpenTime?: string | null;
  ClosedTime?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
  isActive?: boolean | null;
  RestroDisplayPhoto?: string | null;
};

type ApiStationRow = {
  StationCode: string;
  StationName?: string | null;
  Day?: number | null;
  Arrives?: string | null;
  Departs?: string | null;
  arrivalTime?: string | null;
  restros?: Array<any>;
  restroCount?: number;
  arrivalDate?: string | null;
  blockedReasons?: string[];
};

type TrainApiResp = {
  ok: boolean;
  rows?: ApiStationRow[];
  train?: { trainNumber?: number | string | null; trainName?: string | null };
  error?: string;
};

const ADMIN_BASE = (process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in").replace(/\/$/, "");

function fmtHHMM(h?: string | null) {
  if (!h) return "-";
  return String(h).slice(0, 5);
}

function addDaysToIso(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** small fetch helper with timeout */
async function fetchWithTimeout(input: RequestInfo, opts: RequestInit = {}, ms = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(input, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

/** check if restro has an "active holiday" (returns true if blocked) */
async function hasActiveHoliday(restroCode: string | number): Promise<boolean> {
  try {
    const url = `${ADMIN_BASE}/api/restros/${encodeURIComponent(String(restroCode))}/holidays`;
    const res = await fetchWithTimeout(url, { cache: "no-store" }, 8000);
    if (!res.ok) return false;
    const json = await res.json().catch(() => null);
    const rows: any[] = json?.rows ?? json?.data ?? json?.list ?? (Array.isArray(json) ? json : []);
    if (!Array.isArray(rows) || rows.length === 0) return false;
    const now = Date.now();
    for (const r of rows) {
      const deletedAt = r?.deleted_at ? Date.parse(r.deleted_at) : null;
      if (deletedAt) continue;
      const start = r?.start_at ? Date.parse(r.start_at) : NaN;
      const end = r?.end_at ? Date.parse(r.end_at) : NaN;
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      if (start <= now && now <= end) return true;
    }
    return false;
  } catch {
    // conservative: assume not on holiday if we can't check
    return false;
  }
}

/** fetch admin station data (restaurants mapping for a given station code) */
async function fetchAdminStation(stationCode: string) {
  try {
    const url = `${ADMIN_BASE}/api/stations/${encodeURIComponent(stationCode)}`;
    const res = await fetchWithTimeout(url, { cache: "no-store" }, 10000);
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return json;
  } catch (e) {
    return null;
  }
}

/** concurrency batch helper */
async function mapBatched<T, R>(items: T[], batchSize: number, fn: (it: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    const results = await Promise.all(slice.map((s) => fn(s).catch((e) => { console.error("batch error", e); return null as any; })));
    out.push(...results);
  }
  return out;
}

export default function TrainFoodPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const slug = (params?.slug as string) || "";
  const trainNumberFromSlug = slug.split("-")[0] || "";

  const queryDate = searchParams?.get("date") || "";
  const queryBoarding = searchParams?.get("boarding") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allRows, setAllRows] = useState<ApiStationRow[] | null>(null);
  const [stationsWithRestros, setStationsWithRestros] = useState<
    { station: ApiStationRow; restros: ApiRestroFromAdmin[] }[]
  >([]);
  const [debugRawTrainResp, setDebugRawTrainResp] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    if (!trainNumberFromSlug) {
      setError("Invalid train number in URL.");
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // fetch train route
        const trainUrl = `/api/train-routes?train=${encodeURIComponent(trainNumberFromSlug)}&date=${encodeURIComponent(
          queryDate || new Date().toISOString().slice(0, 10),
        )}${queryBoarding ? `&boarding=${encodeURIComponent(queryBoarding)}` : ""}`;

        const trainRes = await fetchWithTimeout(trainUrl, { cache: "no-store" }, 15000);
        if (!trainRes.ok) {
          const text = await trainRes.text().catch(() => "");
          throw new Error(`Train-routes fetch failed: ${trainRes.status} ${text}`);
        }

        const trainJson: TrainApiResp = await trainRes.json().catch(() => ({} as TrainApiResp));
        setDebugRawTrainResp(trainJson);

        if (!trainJson || !trainJson.ok) {
          throw new Error(trainJson?.error || "Train API returned not ok");
        }

        const rows = (trainJson.rows || []) as ApiStationRow[];
        if (cancelled) return;
        setAllRows(rows);

        // find boarding index
        const boardingCode = (queryBoarding || "").toUpperCase();
        const idx = boardingCode ? rows.findIndex((r) => (r.StationCode || "").toUpperCase() === boardingCode) : -1;
        const startIndex = idx >= 0 ? idx : 0;

        // take slice (boarding and onwards)
        const slice = rows.slice(startIndex);

        // limit to reasonable number (e.g., first 40 stations to avoid excessive calls)
        const maxToCheck = 40;
        const toCheck = slice.slice(0, maxToCheck);

        // for each station call admin /api/stations/{code} to get station restaurants
        const stationResults = await mapBatched(
          toCheck,
          6,
          async (st) => {
            const stationCode = (st.StationCode || "").toUpperCase();
            const adminJson = await fetchAdminStation(stationCode);
            // adminJson expected: { station: {...}, restaurants: [ ... ] }
            const restaurants = adminJson?.restaurants ?? adminJson?.restros ?? adminJson?.rows ?? adminJson?.data ?? [];
            // normalize restro objects
            const arr = (restaurants || []).map((r: any) => {
              return {
                RestroCode: r.RestroCode ?? r.restroCode ?? r.Restro_Code ?? r.restro_code ?? null,
                RestroName: r.RestroName ?? r.restroName ?? r.name ?? r.Restro_Name ?? "",
                MinimumOrdermValue: r.MinimumOrdermValue ?? r.minimumOrder ?? r.minOrder ?? null,
                OpenTime: r.OpenTime ?? r.openTime ?? r.open_time ?? null,
                ClosedTime: r.ClosedTime ?? r.closeTime ?? r.close_time ?? null,
                RestroDisplayPhoto: r.RestroDisplayPhoto ?? r.displayPhoto ?? r.photo ?? null,
                isActive: r.isActive ?? r.active ?? null,
              } as ApiRestroFromAdmin;
            });

            return { station: st, restros: arr };
          },
        );

        // now filter each station's restaurants by holidays / active flag
        const stationsWithActive: { station: ApiStationRow; restros: ApiRestroFromAdmin[] }[] = [];
        for (const sr of stationResults) {
          if (!sr) continue;
          const restros = sr.restros || [];
          if (!restros.length) continue;

          // check each restro whether it is active and not on holiday
          const activeArr: ApiRestroFromAdmin[] = [];
          const holidayChecks = await mapBatched(
            restros,
            6,
            async (r) => {
              const code = r.RestroCode ?? r.restroCode;
              if (code == null) return { r, blocked: true, reason: "no code" };
              // if admin marks not active, skip
              if (r.isActive === false) return { r, blocked: true, reason: "inactive flag" };
              const blocked = await hasActiveHoliday(code);
              return { r, blocked, reason: blocked ? "holiday" : "ok" };
            },
          );

          for (const chk of holidayChecks) {
            if (!chk) continue;
            if (!chk.blocked) activeArr.push(chk.r);
          }

          if (activeArr.length > 0) {
            stationsWithActive.push({ station: sr.station, restros: activeArr });
          }
        }

        if (cancelled) return;
        setStationsWithRestros(stationsWithActive);
      } catch (err: any) {
        console.error("Train page error", err);
        setError(String(err?.message ?? err ?? "Failed to load train details."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainNumberFromSlug, queryDate, queryBoarding]);

  const firstActiveStation = stationsWithRestros.length ? stationsWithRestros[0] : null;

  const trainTitleNumber = useMemo(() => {
    // fallback train number from slug
    const n = slug.split("-")[0] || trainNumberFromSlug || "Train";
    return n;
  }, [slug, trainNumberFromSlug]);

  const trainTitleName = debugRawTrainResp?.train?.trainName ? ` – ${debugRawTrainResp.train.trainName}` : "";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>
          <p className="text-sm text-gray-500">Loading train details…</p>
          <p className="text-xs text-gray-400 mt-2">
            This fetches train route and admin station mappings — may take a few seconds. Open DevTools → Network →
            filter "train-routes" or "api/stations".
          </p>
        </div>
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
          Shows boarding station and following stations that have active restaurants (based on RestroMaster + holidays).
        </p>

        {error && <div className="p-3 bg-rose-50 text-rose-700 rounded mb-4">{error}</div>}

        {/* Top summary */}
        {!error && !firstActiveStation && (
          <div className="p-4 bg-gray-50 rounded text-sm text-gray-700">
            <p>No active restaurants found for the selected boarding station / date.</p>
            <ul className="mt-2 text-xs text-gray-600 space-y-1">
              <li>• Train route returned no rows or the boarding station wasn't found in route.</li>
              <li>• Admin mapping for stations returned no restaurants.</li>
              <li>• Restaurant(s) present but blocked by holiday / inactive flag.</li>
            </ul>
            <div className="mt-2 text-xs text-gray-500">
              Tip: use the debug buttons below to inspect raw train response or admin station response.
            </div>
          </div>
        )}

        {!error && firstActiveStation && (
          <section className="mb-6 bg-white rounded-lg shadow-sm border p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <div className="text-sm font-semibold">
                  First active station: {firstActiveStation.station.StationName}{" "}
                  <span className="text-xs text-gray-500">({firstActiveStation.station.StationCode})</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Arrival: {fmtHHMM(firstActiveStation.station.Arrives ?? firstActiveStation.station.arrivalTime)} on{" "}
                  {firstActiveStation.station.arrivalDate ?? queryDate || new Date().toISOString().slice(0, 10)}
                </div>
              </div>

              <div className="mt-3 md:mt-0 text-right text-xs text-gray-600">
                <div>
                  Active restaurants: <span className="font-semibold">{firstActiveStation.restros.length}</span>
                </div>
                <div className="mt-1">
                  Min. order:{" "}
                  <span className="font-semibold">
                    {firstActiveStation.restros[0]?.MinimumOrdermValue ?? firstActiveStation.restros[0]?.minimumOrder ?? "-"}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* debug controls */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => {
              console.log("raw train response", debugRawTrainResp);
              alert("Train response printed to console");
            }}
            className="px-3 py-1 rounded border text-xs"
          >
            Show train response (console)
          </button>

          <button
            onClick={async () => {
              if (!allRows || !allRows.length) {
                alert("No route rows to inspect");
                return;
              }
              // fetch admin for first row as test
              const st = allRows[0];
              const admin = await fetchAdminStation(st.StationCode);
              console.log("admin station data", st.StationCode, admin);
              alert("Admin station printed to console for: " + st.StationCode);
            }}
            className="px-3 py-1 rounded border text-xs"
          >
            Fetch first station admin (console)
          </button>
        </div>

        {/* stations list with active restros */}
        <div className="space-y-6">
          {stationsWithRestros.map(({ station, restros }) => {
            const arrivalDate = station.arrivalDate ?? queryDate || addDaysToIso(queryDate || new Date().toISOString().slice(0, 10), (station.Day ?? 0) - (0 || 0));
            return (
              <section key={station.StationCode + "-" + station.Arrives} className="bg-white rounded-lg shadow-sm border">
                <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3 border-b bg-gray-50">
                  <div>
                    <div className="text-sm font-semibold">
                      {station.StationName} <span className="text-xs text-gray-500">({station.StationCode})</span>
                      {station.Day ? <span className="text-xs text-gray-500"> — Day {station.Day}</span> : null}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Arrival: {fmtHHMM(station.Arrives ?? station.arrivalTime ?? "")} on {arrivalDate}
                    </div>
                    {station.blockedReasons && station.blockedReasons.length ? (
                      <div className="text-xs text-rose-600 mt-1">Info: {station.blockedReasons.join("; ")}</div>
                    ) : null}
                  </div>

                  <div className="mt-2 md:mt-0 text-xs text-right text-gray-600">
                    <div>
                      Active restaurants: <span className="font-semibold">{restros.length}</span>
                    </div>
                    <div className="mt-1">
                      Min. order from{" "}
                      <span className="font-semibold">
                        {restros[0]?.MinimumOrdermValue ?? restros[0]?.minimumOrder ?? "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3">
                  <div className="space-y-3">
                    {restros.map((r) => {
                      const restroCode = r.RestroCode ?? r.restroCode;
                      const restroName = r.RestroName ?? r.restroName ?? "Restaurant";
                      const restroSlug = `${restroCode}-${encodeURIComponent((restroName || "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase())}`;
                      const stationSlug = makeStationSlug(station.StationCode, station.StationName ?? "");
                      const href = `/Stations/${stationSlug}/${restroSlug}?station=${station.StationCode}&restro=${restroCode}&date=${encodeURIComponent(arrivalDate)}&train=${encodeURIComponent(trainTitleNumber)}`;
                      return (
                        <div key={String(restroCode)} className="flex items-center justify-between border rounded-md px-3 py-3 hover:shadow-sm transition-shadow">
                          <div>
                            <div className="text-sm font-semibold">{restroName}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Open: {fmtHHMM(r.OpenTime ?? r.openTime ?? "")} — {fmtHHMM(r.ClosedTime ?? r.closeTime ?? "")} • Min{" "}
                              {r.MinimumOrdermValue ?? r.minimumOrder ?? "-"}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Delivery when train arrives: {fmtHHMM(station.Arrives ?? station.arrivalTime ?? "")} on {arrivalDate}</div>
                          </div>

                          <div className="flex items-center gap-3">
                            <a href={href} className="text-xs md:text-sm px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">
                              Order Now
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
