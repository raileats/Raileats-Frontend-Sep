// app/api/train-restros/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/**
 * High-speed train-restros endpoint (keeps holiday/time checks)
 * - Full route from boarding -> end (no 6-hour limit)
 * - Batched RestroMaster .in(...) queries (single/few DB work)
 * - Admin fallback per-station fetched in parallel with limit
 * - Per-vendor holiday checks preserved, but executed concurrently with limited concurrency and caching
 *
 * NOTE: tune CONCURRENCY / BATCH_SIZE based on your infra.
 */

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

// ---------- small utils ----------
function normalizeToLower(obj: Record<string, any>) {
  const lower: Record<string, any> = {};
  for (const k of Object.keys(obj)) lower[k.toLowerCase()] = obj[k];
  return lower;
}
function normalizeCode(val: any) {
  return String(val ?? "").toUpperCase().trim();
}
function isActiveValue(val: any) {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  if (typeof val === "string") {
    const t = val.trim().toLowerCase();
    if (["0", "false", "no", "n", ""].includes(t)) return false;
    return true;
  }
  return true;
}
async function fetchJson(url: string, opts?: RequestInit) {
  try {
    const r = await fetch(url, { cache: "no-store", ...(opts || {}) });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch {
    return null;
  }
}
function addDaysToIso(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function mapAdminRestroToCommon(adminR: any) {
  return {
    RestroCode: adminR.RestroCode ?? adminR.id ?? adminR.code ?? null,
    RestroName: adminR.RestroName ?? adminR.name ?? adminR.restro_name ?? null,
    isActive: isActiveValue(adminR.IsActive ?? adminR.is_active ?? adminR.active),
    OpenTime: adminR.OpenTime ?? adminR.open_time ?? adminR.openTime ?? null,
    ClosedTime: adminR.ClosedTime ?? adminR.closed_time ?? adminR.closeTime ?? null,
    MinimumOrdermValue: adminR.MinimumOrdermValue ?? adminR.minOrder ?? adminR.minimum_order ?? null,
    RestroDisplayPhoto: adminR.RestroDisplayPhoto ?? adminR.display_photo ?? null,
    raw: adminR,
  };
}
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** limited concurrency mapper */
async function pMap<T, R>(items: T[], mapper: (t: T) => Promise<R>, concurrency = 6): Promise<R[]> {
  const results: R[] = new Array(items.length) as R[];
  let i = 0;
  const workers: Promise<void>[] = [];
  const run = async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      try {
        results[idx] = await mapper(items[idx]);
      } catch (e) {
        results[idx] = undefined as unknown as R;
      }
    }
  };
  for (let w = 0; w < Math.min(concurrency, items.length); w++) workers.push(run());
  await Promise.all(workers);
  return results;
}

// ---------- holiday checker with cache & concurrency ----------
/** Cache for restro-date -> boolean (blocked) */
const holidayCache = new Map<string, boolean>();
async function fetchVendorHolidays(restroCode: string | number) {
  try {
    if (!restroCode) return [] as any[];
    const url = `${ADMIN_BASE.replace(/\/$/, "")}/api/restros/${encodeURIComponent(String(restroCode))}/holidays`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    const rows: any[] = json?.rows ?? json?.data ?? (Array.isArray(json) ? json : []);
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.warn("fetchVendorHolidays failed", restroCode, e);
    return [];
  }
}

/** Given restroCode and isoDate yyyy-mm-dd, return true if holiday covers date.
 * Uses holidayCache to avoid duplicate network calls per restro/date.
 */
async function isVendorHoliday(restroCode: string | number | null, isoDate: string): Promise<boolean> {
  if (!restroCode) return false;
  const key = `${String(restroCode)}::${isoDate}`;
  if (holidayCache.has(key)) return Boolean(holidayCache.get(key));
  try {
    // To avoid N per-vendor network hits we first fetch vendor holidays once and cache per-restro for session.
    // But here we implement per restro+date caching; first call fetches holidays for the restro (not per date).
    const holidaysKeyPrefix = `hols::${String(restroCode)}`;
    // If we haven't fetched holidays list for this restro, fetch and store with a separate cache marker.
    const listKey = `${holidaysKeyPrefix}::list`;
    let rows: any[] | null = null;
    if ((globalThis as any).__restroHolidayListCache && (globalThis as any).__restroHolidayListCache[listKey]) {
      rows = (globalThis as any).__restroHolidayListCache[listKey];
    } else {
      const fetched = await fetchVendorHolidays(restroCode);
      rows = Array.isArray(fetched) ? fetched : [];
      (globalThis as any).__restroHolidayListCache = (globalThis as any).__restroHolidayListCache || {};
      (globalThis as any).__restroHolidayListCache[listKey] = rows;
    }

    if (!rows || !rows.length) {
      holidayCache.set(key, false);
      return false;
    }

    const target = Date.parse(isoDate + "T00:00:00");
    if (!Number.isFinite(target)) {
      holidayCache.set(key, false);
      return false;
    }

    for (const r of rows) {
      const deletedAt = r?.deleted_at ? Date.parse(r.deleted_at) : null;
      if (deletedAt) continue;
      const start = r?.start_at ? Date.parse(r.start_at) : NaN;
      const end = r?.end_at ? Date.parse(r.end_at) : NaN;
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      if (start <= target && target <= end) {
        holidayCache.set(key, true);
        return true;
      }
    }

    holidayCache.set(key, false);
    return false;
  } catch (e) {
    console.warn("isVendorHoliday failed", restroCode, e);
    holidayCache.set(key, false);
    return false;
  }
}

// ---------- main endpoint ----------
export async function GET(req: Request) {
  const url = new URL(req.url);
  const trainParam = (url.searchParams.get("train") || "").trim();
  const date = (url.searchParams.get("date") || "").trim(); // yyyy-mm-dd
  const boarding = (url.searchParams.get("boarding") || "").trim();

  if (!trainParam || !date || !boarding) {
    return NextResponse.json({ ok: false, error: "missing params: train/date/boarding" }, { status: 400 });
  }

  try {
    // 1) fetch full route stops (ordered by StnNumber)
    const q = trainParam;
    const isDigits = /^[0-9]+$/.test(q);
    let stopsRows: any[] = [];

    if (isDigits) {
      const { data: exactData, error: exactErr } = await serviceClient
        .from("TrainRoute")
        .select("StnNumber,StationCode,StationName,Arrives,Departs,Day,Platform,Distance,trainNumber,trainName,runningDays")
        .eq("trainNumber", Number(q))
        .order("StnNumber", { ascending: true })
        .limit(2000);
      if (!exactErr && Array.isArray(exactData) && exactData.length) stopsRows = exactData;
    }

    if (!stopsRows.length) {
      const ilikeQ = `%${q}%`;
      try {
        const { data: partialData } = await serviceClient
          .from("TrainRoute")
          .select("StnNumber,StationCode,StationName,Arrives,Departs,Day,Platform,Distance,trainNumber,trainName,runningDays")
          .or(`trainName.ilike.${ilikeQ},trainNumber_text.ilike.${ilikeQ}`)
          .order("StnNumber", { ascending: true })
          .limit(2000);
        if (Array.isArray(partialData) && partialData.length) stopsRows = partialData;
      } catch {
        // ignore
      }
    }

    if (!stopsRows.length) {
      return NextResponse.json({ ok: true, train: { trainNumber: trainParam, trainName: null }, stations: [] });
    }

    // 2) compute route from boarding -> end (full route, no 6-hr limit)
    const normBoard = normalizeCode(boarding);
    const startIdx = stopsRows.findIndex((r: any) => normalizeCode(r.StationCode ?? r.stationcode ?? r.Station ?? r.station) === normBoard);
    const sliceStart = startIdx >= 0 ? startIdx : 0;
    const routeFromBoarding = stopsRows.slice(sliceStart);

    // compute arrival_date for each stop
    const baseDay = typeof stopsRows[0]?.Day === "number" ? Number(stopsRows[0].Day) : 1;
    const stopsWithArrival = routeFromBoarding.map((s: any) => {
      let arrivalDate = date;
      if (typeof s.Day === "number") {
        const diff = Number(s.Day) - baseDay;
        arrivalDate = addDaysToIso(date, diff);
      }
      return { ...s, arrivalDate };
    });

    // collect unique station codes
    const stationCodesAll = Array.from(
      new Set(stopsWithArrival.map((s: any) => normalizeCode(s.StationCode ?? s.stationcode ?? s.Station ?? s.station)).filter(Boolean)),
    );

    // 3) fetch RestroMaster rows in batches (.in queries)
    const BATCH_SIZE = 150;
    const batches = chunk(stationCodesAll, BATCH_SIZE);
    let restroRows: any[] = [];
    for (const b of batches) {
      try {
        const { data, error } = await serviceClient
          .from("RestroMaster")
          .select("RestroCode,RestroName,StationCode,StationName,0penTime,ClosedTime,WeeklyOff,MinimumOrdermValue,CutOffTime,IsActive,RestroDisplayPhoto")
          .in("StationCode", b)
          .limit(20000);
        if (!error && Array.isArray(data) && data.length) restroRows.push(...data);
      } catch (e) {
        console.warn("RestroMaster batch fetch failed", e);
      }
    }

    // fallback: fetch-all once and filter if still empty
    if (!restroRows.length) {
      try {
        const { data: allRestros } = await serviceClient
          .from("RestroMaster")
          .select("RestroCode,RestroName,StationCode,StationName,0penTime,ClosedTime,WeeklyOff,MinimumOrdermValue,CutOffTime,IsActive,RestroDisplayPhoto")
          .limit(20000);
        if (Array.isArray(allRestros)) {
          const lowerCodes = stationCodesAll.map((c) => c.toLowerCase());
          restroRows = (allRestros || []).filter((r: any) => {
            const rl = normalizeToLower(r);
            const cand = rl.stationcode ?? rl.station_code ?? rl.station ?? rl.stationid ?? rl.stationname ?? null;
            if (!cand) return false;
            return lowerCodes.includes(String(cand).toLowerCase());
          });
        }
      } catch (e) {
        console.warn("RestroMaster fetch-all fallback failed", e);
      }
    }

    // group RestroMaster rows by StationCode
    const grouped: Record<string, any[]> = {};
    for (const r of restroRows) {
      const sc = normalizeCode(r.StationCode ?? r.stationcode ?? r.Station ?? r.station ?? null);
      if (!sc) continue;
      (grouped[sc] = grouped[sc] || []).push(r);
    }

    // 4) admin fallback for station codes missing restromaster (parallel limited)
    const needAdminFor = stationCodesAll.filter((sc) => !grouped[sc] || grouped[sc].length === 0);
    const adminFetchMap: Record<string, any> = {};
    if (needAdminFor.length) {
      await pMap(
        needAdminFor,
        async (sc) => {
          try {
            const adminUrl = `${ADMIN_BASE.replace(/\/$/, "")}/api/stations/${encodeURIComponent(sc)}`;
            const json = await fetchJson(adminUrl);
            adminFetchMap[sc] = json;
          } catch (e) {
            adminFetchMap[sc] = null;
          }
          return null;
        },
        8, // admin concurrency
      );
    }

    // 5) For each station, build vendor list but run holiday checks concurrently (with caching)
    const finalStations: any[] = [];

    // We'll prepare tasks to process stations in parallel (limited concurrency)
    await pMap(
      stopsWithArrival,
      async (s) => {
        const sc = normalizeCode(s.StationCode ?? s.stationcode ?? s.Station ?? s.station ?? "");
        if (!sc) return null;
        const stationName = s.StationName ?? s.stationName ?? s.station_name ?? s.station ?? sc;
        const arrivalDate = s.arrivalDate; // yyyy-mm-dd

        let vendors: any[] = [];

        if (grouped[sc] && Array.isArray(grouped[sc]) && grouped[sc].length) {
          // convert grouped restromaster rows into common shape
          const candidateVendors = grouped[sc]
            .filter((r: any) => isActiveValue(r.IsActive ?? r.isActive ?? r.active))
            .map((r: any) => ({
              RestroCode: r.RestroCode ?? r.restroCode ?? r.id ?? null,
              RestroName: r.RestroName ?? r.restroName ?? r.name ?? null,
              rawR: r,
              OpenTime: r["0penTime"] ?? r.openTime ?? null,
              ClosedTime: r.ClosedTime ?? r.closeTime ?? null,
              MinimumOrdermValue: r.MinimumOrdermValue ?? r.minOrder ?? null,
              RestroDisplayPhoto: r.RestroDisplayPhoto ?? null,
            }));

          // for these candidate vendors, run holiday checks concurrently (limited)
          const checked = await pMap(
            candidateVendors,
            async (cv) => {
              try {
                const restroId = cv.RestroCode ?? null;
                const blocked = await isVendorHoliday(restroId, arrivalDate);
                if (blocked) return null;
                return {
                  RestroCode: cv.RestroCode,
                  RestroName: cv.RestroName,
                  isActive: true,
                  OpenTime: cv.OpenTime,
                  ClosedTime: cv.ClosedTime,
                  MinimumOrdermValue: cv.MinimumOrdermValue,
                  RestroDisplayPhoto: cv.RestroDisplayPhoto,
                  source: "restromaster",
                  raw: cv.rawR,
                };
              } catch (e) {
                return null;
              }
            },
            8, // per-station vendor holiday concurrency
          );
          vendors = checked.filter(Boolean);
        } else {
          // admin fallback: use data from adminFetchMap
          const adminJson = adminFetchMap[sc] ?? null;
          const adminRows = adminJson?.restaurants ?? adminJson?.data ?? adminJson?.rows ?? adminJson ?? null;
          if (Array.isArray(adminRows) && adminRows.length) {
            // prepare candidates
            const candidateVendors = adminRows.map((ar: any) => {
              const mapped = mapAdminRestroToCommon(ar);
              return { mapped, rawA: ar };
            }).filter((x: any) => x.mapped.isActive !== false);

            const checked = await pMap(
              candidateVendors,
              async (cv) => {
                try {
                  const restroId = cv.mapped.RestroCode ?? null;
                  const blocked = await isVendorHoliday(restroId, arrivalDate);
                  if (blocked) return null;
                  return { ...cv.mapped, source: "admin", raw: cv.rawA };
                } catch {
                  return null;
                }
              },
              6,
            );
            vendors = checked.filter(Boolean);
          }
        }

        if (vendors && vendors.length) {
          finalStations.push({
            StationCode: sc,
            StationName: stationName,
            arrival_time: s.Arrives ?? s.Arrival ?? s.arrival_time ?? null,
            Day: typeof s.Day === "number" ? s.Day : s.Day ? Number(s.Day) : null,
            arrival_date: arrivalDate,
            vendors,
          });
        }

        return null;
      },
      6, // station processing concurrency
    );

    // final: sort finalStations by StnNumber order as in routeFromBoarding
    const indexByCode = new Map<string, number>();
    routeFromBoarding.forEach((r: any, idx: number) => indexByCode.set(normalizeCode(r.StationCode ?? r.stationcode ?? r.Station ?? r.station), idx));
    finalStations.sort((a: any, b: any) => (indexByCode.get(a.StationCode) ?? 0) - (indexByCode.get(b.StationCode) ?? 0));

    const trainName = (stopsRows[0]?.trainName ?? stopsRows[0]?.train_name ?? null) || null;
    return NextResponse.json({
      ok: true,
      train: { trainNumber: trainParam, trainName },
      stations: finalStations,
    });
  } catch (e) {
    console.error("train-restros error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
