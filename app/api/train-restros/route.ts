// app/api/train-restros/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/**
 * Optimized + Upstash caching version
 * - caches final response per train/date/boarding in Upstash
 * - caches per-restro holiday lists in Upstash
 * - batched RestroMaster queries + parallel admin fallback
 * - computes arrival_time and halt_time from TrainRoute Stoptime/Arrives/Departs
 */

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const CACHE_TTL = Number(process.env.TRAIN_RESTROS_CACHE_TTL_SEC || "30");
const HOLIDAY_TTL = Number(process.env.TRAIN_RESTROS_HOLIDAY_TTL_SEC || "86400"); // 1 day default

// ---------- utils ----------
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
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * fetchJson with AbortController timeout (no 'timeout' in RequestInit).
 * - default timeoutMs = 6000ms
 * - returns parsed JSON or null on error/timeout/non-OK
 */
async function fetchJson(url: string, opts?: RequestInit, timeoutMs = 6000): Promise<any | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    const merged: RequestInit = {
      cache: "no-store",
      signal: controller.signal,
      ...(opts || {}),
    };

    const r = await fetch(url, merged);
    clearTimeout(id);

    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (err) {
    // aborted or any other fetch error -> return null
    return null;
  }
}

/** time helpers */
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
function addDaysToIso(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/* ---------------- Upstash REST helpers ---------------- */
async function upstashGet(key: string) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  try {
    const url = `${UPSTASH_URL.replace(/\/$/, "")}/get/${encodeURIComponent(key)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, Accept: "application/json" } });
    if (!res.ok) return null;
    const j = await res.json().catch(() => null);
    if (!j || !("result" in j)) return null;
    return j.result === null ? null : JSON.parse(j.result);
  } catch (e) {
    console.warn("upstashGet failed", e);
    return null;
  }
}
async function upstashSet(key: string, value: any, exSeconds = CACHE_TTL) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return false;
  try {
    const encoded = encodeURIComponent(JSON.stringify(value));
    const url = `${UPSTASH_URL.replace(/\/$/, "")}/set/${encodeURIComponent(key)}/${encoded}?ex=${Number(exSeconds)}`;
    const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, Accept: "application/json" } });
    return res.ok;
  } catch (e) {
    console.warn("upstashSet failed", e);
    return false;
  }
}

/* ------------ map admin restro shape ------------- */
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

/* ------------ holiday fetch & cache per-restro ------------- */
async function fetchVendorHolidays(restroCode: string | number) {
  try {
    if (!restroCode) return [];
    const url = `${ADMIN_BASE.replace(/\/$/, "")}/api/restros/${encodeURIComponent(String(restroCode))}/holidays`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const j = await res.json().catch(() => null);
    const rows = j?.rows ?? j?.data ?? (Array.isArray(j) ? j : []);
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.warn("fetchVendorHolidays failed", e);
    return [];
  }
}
async function getVendorHolidaysCached(restroCode: string | number) {
  if (!restroCode) return [];
  const key = `hols:${String(restroCode)}`;
  const cached = await upstashGet(key);
  if (Array.isArray(cached)) return cached;
  const rows = await fetchVendorHolidays(restroCode);
  try {
    await upstashSet(key, rows, HOLIDAY_TTL);
  } catch {}
  return rows;
}
function isHolidayRowsBlocking(rows: any[], isoDate: string) {
  if (!Array.isArray(rows) || !rows.length) return false;
  const target = Date.parse(isoDate + "T00:00:00");
  if (!Number.isFinite(target)) return false;
  for (const r of rows) {
    const deletedAt = r?.deleted_at ? Date.parse(r.deleted_at) : null;
    if (deletedAt) continue;
    const start = r?.start_at ? Date.parse(r.start_at) : NaN;
    const end = r?.end_at ? Date.parse(r.end_at) : NaN;
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (start <= target && target <= end) return true;
  }
  return false;
}

/* ---------------- limited concurrency mapper ---------------- */
async function pMap<T, R>(items: T[], mapper: (t: T) => Promise<R>, concurrency = 12): Promise<R[]> {
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

/* ---------------- main handler ---------------- */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const trainParam = (url.searchParams.get("train") || "").trim();
  const date = (url.searchParams.get("date") || "").trim();
  const boarding = (url.searchParams.get("boarding") || "").trim();

  if (!trainParam || !date || !boarding) {
    return NextResponse.json({ ok: false, error: "missing params: train/date/boarding" }, { status: 400 });
  }

  const cacheKey = `train:${trainParam}::date:${date}::board:${boarding}`;

  // 1) try Redis cache first
  try {
    const cached = await upstashGet(cacheKey);
    if (cached) return NextResponse.json(cached);
  } catch (e) {
    // ignore cache errors
  }

  try {
    // 2) load full route stops
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
      } catch {}
    }

    if (!stopsRows.length) {
      const result = { ok: true, train: { trainNumber: trainParam, trainName: null }, stations: [] };
      await upstashSet(cacheKey, result, CACHE_TTL).catch(() => {});
      return NextResponse.json(result);
    }

    // 3) full route from boarding -> end
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

    // unique station codes
    const stationCodesAll = Array.from(
      new Set(stopsWithArrival.map((s: any) => normalizeCode(s.StationCode ?? s.stationcode ?? s.Station ?? s.station)).filter(Boolean)),
    );

    // 4) batched RestroMaster fetch
    const BATCH = 200;
    const batches = chunk(stationCodesAll, BATCH);
    let restroRows: any[] = [];
    for (const b of batches) {
      try {
        const { data, error } = await serviceClient
          .from("RestroMaster")
          .select(
            "RestroCode,RestroName,StationCode,StationName,0penTime,ClosedTime,WeeklyOff,MinimumOrdermValue,CutOffTime,IsActive,RestroDisplayPhoto",
          )
          .in("StationCode", b)
          .limit(20000);
        if (!error && Array.isArray(data) && data.length) restroRows.push(...data);
      } catch (e) {
        console.warn("RestroMaster batch failed", e);
      }
    }

    // fallback fetch-all once
    if (!restroRows.length) {
      try {
        const { data: allRestros } = await serviceClient
          .from("RestroMaster")
          .select(
            "RestroCode,RestroName,StationCode,StationName,0penTime,ClosedTime,WeeklyOff,MinimumOrdermValue,CutOffTime,IsActive,RestroDisplayPhoto",
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

    // group by station code
    const grouped: Record<string, any[]> = {};
    for (const r of restroRows) {
      const sc = normalizeCode(r.StationCode ?? r.stationcode ?? r.Station ?? r.station ?? null);
      if (!sc) continue;
      (grouped[sc] = grouped[sc] || []).push(r);
    }

    // 5) admin fallback for missing stations (parallel)
    const needAdminFor = stationCodesAll.filter((sc) => !grouped[sc] || grouped[sc].length === 0);
    const adminFetchMap: Record<string, any> = {};
    if (needAdminFor.length) {
      await Promise.allSettled(
        needAdminFor.map(async (sc) => {
          try {
            const adminUrl = `${ADMIN_BASE.replace(/\/$/, "")}/api/stations/${encodeURIComponent(sc)}`;
            const json = await fetchJson(adminUrl);
            adminFetchMap[sc] = json;
          } catch (e) {
            adminFetchMap[sc] = null;
          }
        }),
      );
    }

    // 6) assemble final stations (parallel), but use cached holiday lists for vendors
    const finalStations: any[] = [];
    const stationResults = await pMap(
      stopsWithArrival,
      async (s) => {
        const sc = normalizeCode(s.StationCode ?? s.stationcode ?? s.Station ?? s.station ?? "");
        if (!sc) return null;
        const stationName = s.StationName ?? s.stationName ?? s.station_name ?? s.station ?? sc;
        const arrivalDate = s.arrivalDate;

        const arrival_time = s.Arrives ?? s.Arrival ?? s.arrival_time ?? null;
        let halt_time: string | null = null;
        if (s.Stoptime ?? s.stoptime ?? s.StopTime) {
          const stRaw = s.Stoptime ?? s.stoptime ?? s.StopTime;
          const sec = timeToSeconds(stRaw);
          halt_time = secondsToHuman(sec);
        } else if (s.Arrives && s.Departs) {
          const aSec = timeToSeconds(s.Arrives);
          const dSec = timeToSeconds(s.Departs);
          if (aSec !== null && dSec !== null) {
            const diff = dSec - aSec;
            if (diff >= 0) halt_time = secondsToHuman(diff);
          }
        }

        let vendors: any[] = [];

        if (grouped[sc] && grouped[sc].length) {
          // convert grouped restromaster rows into common shape
          const candidateVendors = grouped[sc]
            .filter((r: any) => isActiveValue(r.IsActive ?? r.isActive ?? r.active))
            .map((r: any) => ({
              RestroCode: r.RestroCode ?? r.restroCode ?? r.id ?? null,
              RestroName: r.RestroName ?? r.restroName ?? r.name ?? null,
              OpenTime: r["0penTime"] ?? r.openTime ?? null,
              ClosedTime: r.ClosedTime ?? r.closeTime ?? null,
              MinimumOrdermValue: r.MinimumOrdermValue ?? r.minOrder ?? null,
              RestroDisplayPhoto: r.RestroDisplayPhoto ?? null,
              raw: r,
            }));

          // run holiday filter but using cached holiday lists (Upstash)
          const checked = await pMap(
            candidateVendors,
            async (cv) => {
              try {
                const restroId = cv.RestroCode ?? null;
                if (!restroId) return null;
                const rows = await getVendorHolidaysCached(restroId);
                const blocked = isHolidayRowsBlocking(rows, arrivalDate);
                if (blocked) return null;
                return { RestroCode: cv.RestroCode, RestroName: cv.RestroName, isActive: true, OpenTime: cv.OpenTime, ClosedTime: cv.ClosedTime, MinimumOrdermValue: cv.MinimumOrdermValue, RestroDisplayPhoto: cv.RestroDisplayPhoto, source: "restromaster", raw: cv.raw };
              } catch {
                return null;
              }
            },
            10,
          );

          vendors = (checked || []).filter(Boolean);
        } else {
          const adminJson = adminFetchMap[sc] ?? null;
          const adminRows = adminJson?.restaurants ?? adminJson?.data ?? adminJson?.rows ?? adminJson ?? null;
          if (Array.isArray(adminRows) && adminRows.length) {
            const candidate = adminRows.map((ar: any) => ({ mapped: mapAdminRestroToCommon(ar), rawA: ar })).filter((x: any) => x.mapped.isActive !== false);
            const checked = await pMap(
              candidate,
              async (cv) => {
                try {
                  const restroId = cv.mapped.RestroCode ?? null;
                  if (!restroId) return null;
                  const rows = await getVendorHolidaysCached(restroId);
                  const blocked = isHolidayRowsBlocking(rows, arrivalDate);
                  if (blocked) return null;
                  return { ...cv.mapped, source: "admin", raw: cv.rawA };
                } catch {
                  return null;
                }
              },
              8,
            );
            vendors = (checked || []).filter(Boolean);
          }
        }

        if (vendors && vendors.length) {
          return {
            StationCode: sc,
            StationName: stationName,
            arrival_time,
            halt_time,
            Day: typeof s.Day === "number" ? s.Day : s.Day ? Number(s.Day) : null,
            arrival_date: arrivalDate,
            vendors,
          };
        }
        return null;
      },
      12,
    );

    for (const r of stationResults) if (r) finalStations.push(r);

    // sort finalStations
    const indexByCode = new Map<string, number>();
    routeFromBoarding.forEach((r: any, idx: number) =>
      indexByCode.set(normalizeCode(r.StationCode ?? r.stationcode ?? r.Station ?? r.station), idx),
    );
    finalStations.sort((a: any, b: any) => (indexByCode.get(a.StationCode) ?? 0) - (indexByCode.get(b.StationCode) ?? 0));

    const trainName = (stopsRows[0]?.trainName ?? stopsRows[0]?.train_name ?? null) || null;
    const result = { ok: true, train: { trainNumber: trainParam, trainName }, stations: finalStations };

    // cache final result
    try {
      await upstashSet(cacheKey, result, CACHE_TTL);
    } catch {}

    return NextResponse.json(result);
  } catch (e) {
    console.error("train-restros error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
