import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/**
 * Fast & robust train-restros endpoint
 * - Full route from boarding -> end
 * - Exposes arrival_time (Arrives) and halt_time (Stoptime or Departs-Arrives)
 * - Batched RestroMaster .in(...) queries
 * - Admin fallback fetched in parallel (normalized)
 * - Short process-level cache to speed repeated calls
 */

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";
const CACHE_TTL_MS = 30 * 1000; // 30s

;(globalThis as any).__trainRestrosCache = (globalThis as any).__trainRestrosCache || new Map();
function cacheGet(k: string) {
  const m = (globalThis as any).__trainRestrosCache as Map<string, { ts: number; v: any }>;
  const r = m.get(k);
  if (!r) return null;
  if (Date.now() - r.ts > CACHE_TTL_MS) {
    m.delete(k);
    return null;
  }
  return r.v;
}
function cacheSet(k: string, v: any) {
  const m = (globalThis as any).__trainRestrosCache as Map<string, { ts: number; v: any }>;
  m.set(k, { ts: Date.now(), v });
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
  // defensive mapping — admin response can have many different keys
  const a = normalizeToLower(adminR || {});
  return {
    RestroCode: adminR.RestroCode ?? adminR.id ?? a.id ?? a.restrocode ?? a.restro_code ?? null,
    RestroName: adminR.RestroName ?? adminR.name ?? a.name ?? a.restroname ?? a.restro_name ?? null,
    isActive: isActiveValue(adminR.IsActive ?? adminR.is_active ?? a.active ?? a.is_active ?? a.isactive),
    OpenTime: adminR.OpenTime ?? adminR.open_time ?? a.open_time ?? a.openTime ?? null,
    ClosedTime: adminR.ClosedTime ?? adminR.closed_time ?? a.closed_time ?? a.closeTime ?? null,
    MinimumOrdermValue:
      adminR.MinimumOrdermValue ?? adminR.minOrder ?? a.minOrder ?? a.minimum_order ?? a.minimumOrder ?? null,
    RestroDisplayPhoto:
      adminR.RestroDisplayPhoto ?? adminR.display_photo ?? a.display_photo ?? a.restrodisplayphoto ?? null,
    raw: adminR,
  };
}
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** parse "HH:MM:SS" or "HH:MM" => seconds since midnight */
function timeToSeconds(t: string | null | undefined) {
  if (!t) return null;
  const s = String(t).trim();
  if (!s) return null;
  const parts = s.split(":").map((x) => Number(x));
  if (parts.some((p) => Number.isNaN(p))) return null;
  const hh = parts[0] ?? 0;
  const mm = parts[1] ?? 0;
  const ss = parts[2] ?? 0;
  return hh * 3600 + mm * 60 + ss;
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
  const date = (url.searchParams.get("date") || "").trim();
  const boarding = (url.searchParams.get("boarding") || "").trim();

  if (!trainParam || !date || !boarding) {
    return NextResponse.json({ ok: false, error: "missing params: train/date/boarding" }, { status: 400 });
  }

  const cacheKey = `train:${trainParam}::date:${date}::board:${boarding}`;
  const cached = cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    // 1) load full route stops (include Stoptime / Arrives / Departs)
    const q = trainParam;
    const isDigits = /^[0-9]+$/.test(q);
    let stopsRows: any[] = [];
    const selectCols =
      "StnNumber,StationCode,StationName,Arrives,Departs,Day,Platform,Distance,Stoptime,trainNumber,trainName,runningDays";

    if (isDigits) {
      const { data: exactData, error: exactErr } = await serviceClient
        .from("TrainRoute")
        .select(selectCols)
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
          .select(selectCols)
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

    // 2) route from boarding -> end
    const normBoard = normalizeCode(boarding);
    const startIdx = stopsRows.findIndex((r: any) =>
      normalizeCode(r.StationCode ?? r.stationcode ?? r.Station ?? r.station) === normBoard,
    );
    const sliceStart = startIdx >= 0 ? startIdx : 0;
    const routeFromBoarding = stopsRows.slice(sliceStart);

    // compute arrival_date per stop
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
      new Set(
        stopsWithArrival
          .map((s: any) => normalizeCode(s.StationCode ?? s.stationcode ?? s.Station ?? s.station))
          .filter(Boolean),
      ),
    );

    // 3) batch fetch RestroMaster rows
    const BATCH = 200;
    const batches = chunk(stationCodesAll, BATCH);
    let restroRows: any[] = [];
    for (const b of batches) {
      try {
        const { data, error } = await serviceClient
          .from("RestroMaster")
          // request common columns — if your table has different column names ensure they exist.
          .select(
            "RestroCode,RestroName,StationCode,StationName,0penTime,OpenTime,ClosedTime,WeeklyOff,MinimumOrdermValue,CutOffTime,IsActive,RestroDisplayPhoto",
          )
          .in("StationCode", b)
          .limit(20000);
        if (!error && Array.isArray(data) && data.length) restroRows.push(...data);
      } catch (e) {
        console.warn("RestroMaster batch failed", e);
      }
    }

    // fallback: fetch-all once and filter (only if batch returned nothing)
    if (!restroRows.length) {
      try {
        const { data: allRestros } = await serviceClient
          .from("RestroMaster")
          .select(
            "RestroCode,RestroName,StationCode,StationName,0penTime,OpenTime,ClosedTime,WeeklyOff,MinimumOrdermValue,CutOffTime,IsActive,RestroDisplayPhoto",
          )
          .limit(20000);
        if (Array.isArray(allRestros)) {
          const lower = stationCodesAll.map((c) => c.toLowerCase());
          restroRows = (allRestros || []).filter((r: any) => {
            const rl = normalizeToLower(r);
            const cand = rl.stationcode ?? rl.station_code ?? rl.station ?? rl.stationid ?? rl.stationname ?? null;
            if (!cand) return false;
            return lower.includes(String(cand).toLowerCase());
          });
        }
      } catch (e) {
        console.warn("RestroMaster fetch-all fallback failed", e);
      }
    }

    // group restromaster rows by normalized station code
    const grouped: Record<string, any[]> = {};
    for (const r of restroRows) {
      // station code may be present under different keys; handle defensively
      const raw = normalizeToLower(r);
      const codeCandidate =
        r.StationCode ?? r.stationcode ?? r.Station ?? r.station ?? raw.stationcode ?? raw.station ?? raw.stationid ?? null;
      const sc = normalizeCode(codeCandidate ?? null);
      if (!sc) continue;
      (grouped[sc] = grouped[sc] || []).push(r);
    }

    // 4) admin fallback for missing stations (parallel)
    const needAdminFor = stationCodesAll.filter((sc) => !grouped[sc] || grouped[sc].length === 0);
    const adminFetchMap: Record<string, any> = {};
    if (needAdminFor.length) {
      const promises = needAdminFor.map(async (sc) => {
        try {
          const adminUrl = `${ADMIN_BASE.replace(/\/$/, "")}/api/stations/${encodeURIComponent(sc)}`;
          const json = await fetchJson(adminUrl);
          adminFetchMap[sc] = json;
        } catch (e) {
          adminFetchMap[sc] = null;
        }
      });
      await Promise.allSettled(promises);
    }

    // 5) assemble final stations (no per-vendor holiday checks here)
    const finalStations: any[] = [];

    for (const s of stopsWithArrival) {
      const sc = normalizeCode(s.StationCode ?? s.stationcode ?? s.Station ?? s.station ?? "");
      if (!sc) continue;
      const stationName = s.StationName ?? s.stationName ?? s.station_name ?? s.station ?? sc;
      const arrivalDate = s.arrivalDate;

      const arrival_time = s.Arrives ?? s.Arrival ?? s.arrival_time ?? null;
      let halt_time: string | null = null;

      // prefer Stoptime if present
      const stopRaw = s.Stoptime ?? s.stoptime ?? s.StopTime ?? null;
      if (stopRaw) {
        const sec = timeToSeconds(stopRaw);
        halt_time = secondsToHuman(sec);
      } else if (s.Arrives && s.Departs) {
        const aSec = timeToSeconds(s.Arrives);
        const dSec = timeToSeconds(s.Departs);
        if (aSec !== null && dSec !== null) {
          let diff = dSec - aSec;
          // if departure smaller than arrival (midnight rollover), adjust by +24h
          if (diff < 0) diff += 24 * 3600;
          if (diff >= 0) halt_time = secondsToHuman(diff);
        }
      }

      // vendors from RestroMaster or admin fallback
      let vendors: any[] = [];
      if (grouped[sc] && Array.isArray(grouped[sc]) && grouped[sc].length) {
        vendors = grouped[sc]
          .filter((r: any) => isActiveValue(r.IsActive ?? r.is_active ?? r.isActive ?? r.active ?? r.Active))
          .map((r: any) => {
            const raw = normalizeToLower(r);
            const restroCode = r.RestroCode ?? r.restroCode ?? r.id ?? raw.id ?? raw.restrocode ?? raw.code ?? null;
            return {
              RestroCode: restroCode,
              RestroName: r.RestroName ?? r.restroName ?? r.name ?? raw.name ?? null,
              isActive: isActiveValue(r.IsActive ?? r.is_active ?? r.active),
              OpenTime: r["0penTime"] ?? r.OpenTime ?? r.open_time ?? raw.open_time ?? null,
              ClosedTime: r.ClosedTime ?? r.closeTime ?? r.closed_time ?? raw.closed_time ?? null,
              MinimumOrdermValue: r.MinimumOrdermValue ?? r.minOrder ?? raw.minorder ?? null,
              RestroDisplayPhoto: r.RestroDisplayPhoto ?? r.display_photo ?? raw.display_photo ?? null,
              source: "restromaster",
              raw: r,
            };
          });
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
          halt_time,
          Day: typeof s.Day === "number" ? s.Day : s.Day ? Number(s.Day) : null,
          arrival_date: arrivalDate,
          vendors,
        });
      }
    }

    // 6) sort finalStations in route order (as per routeFromBoarding)
    const indexByCode = new Map<string, number>();
    routeFromBoarding.forEach((r: any, idx: number) =>
      indexByCode.set(normalizeCode(r.StationCode ?? r.stationcode ?? r.Station ?? r.station), idx),
    );
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
