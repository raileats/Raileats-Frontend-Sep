// app/api/train-restros/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/**
 * Fast train-restros endpoint (no admin HTTP fallback)
 * - Full route from boarding -> end
 * - Batched RestroMaster .in(...) queries (no per-station admin calls)
 * - Short persistent-ish in-process cache (increase TTL to 5min)
 *
 * To reach 1s consistently: add Redis/VercelKV caching + DB indexes.
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
;(globalThis as any).__trainRestrosCache = (globalThis as any).__trainRestrosCache || new Map();
function cacheGet(key: string) {
  const map = (globalThis as any).__trainRestrosCache as Map<string, { ts: number; v: any }>;
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    map.delete(key);
    return null;
  }
  return entry.v;
}
function cacheSet(key: string, v: any) {
  const map = (globalThis as any).__trainRestrosCache as Map<string, { ts: number; v: any }>;
  map.set(key, { ts: Date.now(), v });
}

function normalizeCode(val: any) {
  return String(val ?? "").toUpperCase().trim();
}
function isActiveValue(val: any) {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  if (typeof val === "string") {
    const t = val.trim().toLowerCase();
    return !["0", "false", "no", "n", ""].includes(t);
  }
  return true;
}
function addDaysToIso(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
function timeToSeconds(t: any) {
  if (!t) return null;
  const s = String(t).trim();
  if (!s) return null;
  const parts = s.split(":").map(Number);
  if (parts.some(Number.isNaN)) return null;
  return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
}
function secondsToHuman(sec: number | null) {
  if (sec === null || !Number.isFinite(sec)) return null;
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const trainParam = (url.searchParams.get("train") || "").trim();
  const date = (url.searchParams.get("date") || "").trim(); // yyyy-mm-dd
  const boarding = (url.searchParams.get("boarding") || "").trim();

  if (!trainParam || !date || !boarding) {
    return NextResponse.json({ ok: false, error: "missing params: train/date/boarding" }, { status: 400 });
  }

  const cacheKey = `t:${trainParam}|d:${date}|b:${boarding}`;
  const cached = cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    // 1) fetch full route stops (only needed cols; include Stoptime/Arrives/Departs)
    const selectCols =
      "StnNumber,StationCode,StationName,Arrives,Departs,Day,Platform,Distance,Stoptime,trainNumber,trainName";
    let stopsRows: any[] = [];
    const isDigits = /^[0-9]+$/.test(trainParam);

    if (isDigits) {
      const { data, error } = await serviceClient
        .from("TrainRoute")
        .select(selectCols)
        .eq("trainNumber", Number(trainParam))
        .order("StnNumber", { ascending: true })
        .limit(2000);
      if (!error && Array.isArray(data) && data.length) stopsRows = data;
    }

    if (!stopsRows.length) {
      const ilikeQ = `%${trainParam}%`;
      const { data } = await serviceClient
        .from("TrainRoute")
        .select(selectCols)
        .or(`trainName.ilike.${ilikeQ},trainNumber_text.ilike.${ilikeQ}`)
        .order("StnNumber", { ascending: true })
        .limit(2000);
      if (Array.isArray(data) && data.length) stopsRows = data;
    }

    if (!stopsRows.length) {
      const result = { ok: true, train: { trainNumber: trainParam, trainName: null }, stations: [] };
      cacheSet(cacheKey, result);
      return NextResponse.json(result);
    }

    // 2) route from boarding -> end (full route)
    const normBoard = normalizeCode(boarding);
    const startIdx = stopsRows.findIndex((r) => normalizeCode(r.StationCode ?? r.stationcode ?? r.Station ?? r.station) === normBoard);
    const sliceStart = startIdx >= 0 ? startIdx : 0;
    const routeFromBoarding = stopsRows.slice(sliceStart);

    // compute arrival_date for each stop
    const baseDay = typeof stopsRows[0]?.Day === "number" ? Number(stopsRows[0].Day) : 1;
    const stopsWithArrival = routeFromBoarding.map((s) => {
      let arrivalDate = date;
      if (typeof s.Day === "number") {
        const diff = Number(s.Day) - baseDay;
        arrivalDate = addDaysToIso(date, diff);
      }
      return { ...s, arrivalDate };
    });

    // collect unique station codes
    const stationCodesAll = Array.from(new Set(stopsWithArrival.map((s) => normalizeCode(s.StationCode ?? s.stationcode ?? s.Station ?? s.station)).filter(Boolean)));

    // 3) single/few batched DB calls to RestroMaster (no admin fallback)
    const BATCH = 200;
    const batches = chunk(stationCodesAll, BATCH);
    let restroRows: any[] = [];

    for (const b of batches) {
      try {
        const { data, error } = await serviceClient
          .from("RestroMaster")
          // SELECT only truly needed columns (smaller payload)
          .select("RestroCode,RestroName,StationCode,IsActive,OpenTime,ClosedTime,MinimumOrdermValue,RestroDisplayPhoto")
          .in("StationCode", b)
          .limit(20000);
        if (!error && Array.isArray(data) && data.length) restroRows.push(...data);
      } catch (err) {
        console.warn("RestroMaster batch error", err);
      }
    }

    // group restromaster rows by station code
    const grouped: Record<string, any[]> = {};
    for (const r of restroRows) {
      const sc = normalizeCode(r.StationCode ?? r.stationcode ?? r.Station ?? r.station ?? null);
      if (!sc) continue;
      (grouped[sc] = grouped[sc] || []).push(r);
    }

    // 4) assemble finalStations (no admin fallback; compute halt_time)
    const finalStations: any[] = [];
    for (const s of stopsWithArrival) {
      const sc = normalizeCode(s.StationCode ?? s.stationcode ?? s.Station ?? s.station ?? "");
      if (!sc) continue;
      const stationName = s.StationName ?? s.stationName ?? s.station_name ?? s.station ?? sc;
      const arrival_time = s.Arrives ?? s.Arrival ?? s.arrival_time ?? null;
      let halt_time: string | null = null;

      // prefer Stoptime
      const stRaw = s.Stoptime ?? s.stoptime ?? s.StopTime;
      if (stRaw) {
        const sec = timeToSeconds(stRaw);
        halt_time = secondsToHuman(sec);
      } else if (s.Arrives && s.Departs) {
        const a = timeToSeconds(s.Arrives);
        const d = timeToSeconds(s.Departs);
        if (a !== null && d !== null && d >= a) halt_time = secondsToHuman(d - a);
      }

      let vendors: any[] = [];
      if (grouped[sc] && grouped[sc].length) {
        vendors = grouped[sc]
          .filter((r) => isActiveValue(r.IsActive ?? r.is_active ?? r.active))
          .map((r) => ({
            RestroCode: r.RestroCode ?? r.id ?? null,
            RestroName: r.RestroName ?? r.name ?? null,
            isActive: r.IsActive ?? true,
            OpenTime: r.OpenTime ?? null,
            ClosedTime: r.ClosedTime ?? null,
            MinimumOrdermValue: r.MinimumOrdermValue ?? null,
            RestroDisplayPhoto: r.RestroDisplayPhoto ?? null,
            source: "restromaster",
            raw: r,
          }));
      }

      if (vendors && vendors.length) {
        finalStations.push({
          StationCode: sc,
          StationName: stationName,
          arrival_time,
          halt_time,
          Day: typeof s.Day === "number" ? s.Day : s.Day ? Number(s.Day) : null,
          arrival_date: s.arrivalDate,
          vendors,
        });
      }
    }

    // sort by route order
    const indexByCode = new Map<string, number>();
    routeFromBoarding.forEach((r: any, idx: number) => indexByCode.set(normalizeCode(r.StationCode ?? r.stationcode ?? r.Station ?? r.station), idx));
    finalStations.sort((a: any, b: any) => (indexByCode.get(a.StationCode) ?? 0) - (indexByCode.get(b.StationCode) ?? 0));

    const trainName = (stopsRows[0]?.trainName ?? stopsRows[0]?.train_name ?? null) || null;
    const result = { ok: true, train: { trainNumber: trainParam, trainName }, stations: finalStations };

    cacheSet(cacheKey, result);
    return NextResponse.json(result);
  } catch (e) {
    console.error("train-restros error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
