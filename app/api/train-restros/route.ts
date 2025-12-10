// app/api/train-restros/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/**
 * Fast train-restros endpoint
 * - Full route from boarding -> end
 * - Batched RestroMaster .in(...) queries
 * - Admin fallback per-station fetched in parallel (limited concurrency)
 * - NO holiday blocking (old behaviour)
 * - Adds arrival_time and halt_time (derived from Stoptime or Arrives/Departs)
 * - Adds an in-memory cache for identical train+date+boarding requests (short TTL)
 */

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";
const CACHE_TTL_MS = 60 * 1000; // 60s cache to make repeated calls fast

// Simple in-memory cache (process-global)
;(globalThis as any).__trainRestrosCache = (globalThis as any).__trainRestrosCache || new Map<string, { ts: number; value: any }>();

function cacheGet(key: string) {
  const m = (globalThis as any).__trainRestrosCache as Map<string, any>;
  const rec = m.get(key);
  if (!rec) return null;
  if (Date.now() - rec.ts > CACHE_TTL_MS) {
    m.delete(key);
    return null;
  }
  return rec.value;
}
function cacheSet(key: string, value: any) {
  const m = (globalThis as any).__trainRestrosCache as Map<string, any>;
  m.set(key, { ts: Date.now(), value });
}

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

/** parse "HH:MM:SS" or "H:MM:SS" or "HH:MM" into seconds since midnight, null if invalid */
function timeToSeconds(t: string | null | undefined) {
  if (!t) return null;
  const s = String(t).trim();
  if (!s) return null;
  const parts = s.split(":").map((x) => Number(x));
  if (parts.length < 2 || parts.some((p) => Number.isNaN(p))) return null;
  const hh = parts[0] || 0;
  const mm = parts[1] || 0;
  const ss = parts[2] || 0;
  return hh * 3600 + mm * 60 + ss;
}
/** seconds -> "H:MM" or "MM" (human readable) */
function secondsToHM(sec: number | null) {
  if (sec === null || !Number.isFinite(sec)) return null;
  const mm = Math.floor((sec % 3600) / 60);
  const hh = Math.floor(sec / 3600);
  if (hh > 0) return `${hh}:${String(mm).padStart(2, "0")}`;
  return `${mm}m`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const trainParam = (url.searchParams.get("train") || "").trim();
  const date = (url.searchParams.get("date") || "").trim(); // yyyy-mm-dd
  const boarding = (url.searchParams.get("boarding") || "").trim();

  if (!trainParam || !date || !boarding) {
    return NextResponse.json({ ok: false, error: "missing params: train/date/boarding" }, { status: 400 });
  }

  // cache key
  const cacheKey = `train:${trainParam}::date:${date}::board:${boarding}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    // 1) fetch full route stops (ordered by StnNumber). include Stoptime
    const q = trainParam;
    const isDigits = /^[0-9]+$/.test(q);
    let stopsRows: any[] = [];

    if (isDigits) {
      const { data: exactData, error: exactErr } = await serviceClient
        .from("TrainRoute")
        .select("StnNumber,StationCode,StationName,Arrives,Departs,Day,Platform,Distance,Stoptime,trainNumber,trainName,runningDays")
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
          .select("StnNumber,StationCode,StationName,Arrives,Departs,Day,Platform,Distance,Stoptime,trainNumber,trainName,runningDays")
          .or(`trainName.ilike.${ilikeQ},trainNumber_text.ilike.${ilikeQ}`)
          .order("StnNumber", { ascending: true })
          .limit(2000);
        if (Array.isArray(partialData) && partialData.length) stopsRows = partialData;
      } catch {
        // ignore
      }
    }

    if (!stopsRows.length) {
      const result = { ok: true, train: { trainNumber: trainParam, trainName: null }, stations: [] };
      cacheSet(cacheKey, result);
      return NextResponse.json(result);
    }

    // 2) compute route from boarding -> end (full route)
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

    // unique station codes
    const stationCodesAll = Array.from(
      new Set(stopsWithArrival.map((s: any) => normalizeCode(s.StationCode ?? s.stationcode ?? s.Station ?? s.station)).filter(Boolean)),
    );

    // 3) fetch RestroMaster rows in batches
    const BATCH_SIZE = 200;
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

    // fallback: fetch-all once then filter client-side (only if above returned nothing)
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
        12, // increase concurrency a bit to speed up
      );
    }

    // 5) assemble final stations (no holiday blocking) and compute halt_time/stoptime
    const finalStations: any[] = [];
    for (const s of stopsWithArrival) {
      const sc = normalizeCode(s.StationCode ?? s.stationcode ?? s.Station ?? s.station ?? "");
      if (!sc) continue;
      const stationName = s.StationName ?? s.stationName ?? s.station_name ?? s.station ?? sc;
      const arrivalDate = s.arrivalDate;

      // compute arrival_time and halt_time using Stoptime or Arrives/Departs
      const arrival_time = s.Arrives ?? s.Arrival ?? s.arrival_time ?? null;
      let stoptimeRaw = s.Stoptime ?? s.stoptime ?? s.StopTime ?? null;
      // if stoptimeRaw is null but Arrives/Departs present, compute difference
      if (!stoptimeRaw && s.Arrives && s.Departs) {
        const aSec = timeToSeconds(s.Arrives);
        const dSec = timeToSeconds(s.Departs);
        if (aSec !== null && dSec !== null) {
          const diff = dSec - aSec;
          if (diff >= 0) {
            // format as "mm" or "h:mm"
            stoptimeRaw = secondsToHM(diff);
          }
        }
      } else if (stoptimeRaw && typeof stoptimeRaw === "string" && stoptimeRaw.includes(":")) {
        // if Stoptime is "0:05:00" format, convert to human form "0:05" or "5m"
        const sec = timeToSeconds(stoptimeRaw);
        if (sec !== null) stoptimeRaw = secondsToHM(sec);
      }

      let vendors: any[] = [];

      if (grouped[sc] && Array.isArray(grouped[sc]) && grouped[sc].length) {
        vendors = grouped[sc]
          .filter((r: any) => isActiveValue(r.IsActive ?? r.isActive ?? r.active))
          .map((r: any) => ({
            RestroCode: r.RestroCode ?? r.restroCode ?? r.id ?? null,
            RestroName: r.RestroName ?? r.restroName ?? r.name ?? null,
            isActive: r.IsActive ?? r.isActive ?? true,
            OpenTime: r["0penTime"] ?? r.openTime ?? null,
            ClosedTime: r.ClosedTime ?? r.closeTime ?? null,
            MinimumOrdermValue: r.MinimumOrdermValue ?? r.minOrder ?? null,
            RestroDisplayPhoto: r.RestroDisplayPhoto ?? null,
            source: "restromaster",
            raw: r,
          }));
      } else {
        const adminJson = adminFetchMap[sc] ?? null;
        const adminRows = adminJson?.restaurants ?? adminJson?.data ?? adminJson?.rows ?? adminJson ?? null;
        if (Array.isArray(adminRows) && adminRows.length) {
          vendors = adminRows
            .map((ar: any) => ({ ...mapAdminRestroToCommon(ar), source: "admin", raw: ar }))
            .filter((v: any) => v.isActive !== false);
        }
      }

      if (vendors && vendors.length) {
        finalStations.push({
          StationCode: sc,
          StationName: stationName,
          arrival_time,
          stoptime: stoptimeRaw,
          Day: typeof s.Day === "number" ? s.Day : s.Day ? Number(s.Day) : null,
          arrival_date: arrivalDate,
          vendors,
        });
      }
    }

    // sort finalStations by route order
    const indexByCode = new Map<string, number>();
    routeFromBoarding.forEach((r: any, idx: number) => indexByCode.set(normalizeCode(r.StationCode ?? r.stationcode ?? r.Station ?? r.station), idx));
    finalStations.sort((a: any, b: any) => (indexByCode.get(a.StationCode) ?? 0) - (indexByCode.get(b.StationCode) ?? 0));

    const trainName = (stopsRows[0]?.trainName ?? stopsRows[0]?.train_name ?? null) || null;

    const result = {
      ok: true,
      train: { trainNumber: trainParam, trainName },
      stations: finalStations,
    };

    // cache result for short TTL
    cacheSet(cacheKey, result);

    return NextResponse.json(result);
  } catch (e) {
    console.error("train-restros error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
