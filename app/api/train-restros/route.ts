// app/api/train-restros/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/**
 * Optimized train-restros endpoint
 * - returns all stations on the route that have active vendors
 * - keeps holiday checks but:
 *   * runs them highly parallel with a concurrency limiter
 *   * applies short fetch timeouts
 *   * caches holiday results in-memory with TTL (5min default)
 *
 * Note: in-memory cache helps warm instances. For consistent sub-1s across cold starts,
 * add a shared cache (Redis) or admin-side batch holiday endpoint.
 */

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

// ---------- util helpers ----------
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
function addDaysToIso(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ---------- fetch with timeout ----------
async function fetchWithTimeout(input: string, timeoutMs = 800) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { cache: "no-store", signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (e) {
    clearTimeout(id);
    return null;
  }
}

// ---------- admin restro mapper ----------
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

// ---------- in-memory holiday cache ----------
type HolidayCacheEntry = { blocked: boolean; ts: number };
const HOLIDAY_TTL_MS = 1000 * 60 * 5; // 5 minutes
const holidayCache: Map<string, HolidayCacheEntry> = new Map(); // key = `${restroId}::${isoDate}`

// ---------- holiday check with cache + timeout ----------
async function isVendorHolidayCached(restroCode: string | number, isoDate: string) {
  if (!restroCode) return false;
  const key = `${String(restroCode)}::${isoDate}`;
  const now = Date.now();
  const cached = holidayCache.get(key);
  if (cached && now - cached.ts < HOLIDAY_TTL_MS) {
    return cached.blocked;
  }

  // fetch and cache result (use fetchWithTimeout)
  try {
    const url = `${ADMIN_BASE.replace(/\/$/, "")}/api/restros/${encodeURIComponent(String(restroCode))}/holidays`;
    const json = await fetchWithTimeout(url, 800); // 800ms timeout
    const rows: any[] = json?.rows ?? json?.data ?? (Array.isArray(json) ? json : []);
    let blocked = false;
    if (Array.isArray(rows) && rows.length) {
      const target = Date.parse(isoDate + "T00:00:00");
      if (Number.isFinite(target)) {
        for (const r of rows) {
          const deletedAt = r?.deleted_at ? Date.parse(r.deleted_at) : null;
          if (deletedAt) continue;
          const start = r?.start_at ? Date.parse(r.start_at) : NaN;
          const end = r?.end_at ? Date.parse(r.end_at) : NaN;
          if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
          if (start <= target && target <= end) {
            blocked = true;
            break;
          }
        }
      }
    }
    holidayCache.set(key, { blocked, ts: Date.now() });
    return blocked;
  } catch (e) {
    // on failure: be permissive (do not block)
    holidayCache.set(key, { blocked: false, ts: Date.now() });
    return false;
  }
}

// ---------- concurrency limiter (simple) ----------
function pLimit(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    const fn = queue.shift();
    if (!fn) return;
    active++;
    fn();
  };
  return function <T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = () => {
        fn()
          .then((v) => {
            resolve(v);
            active--;
            if (queue.length) next();
          })
          .catch((err) => {
            reject(err);
            active--;
            if (queue.length) next();
          });
      };
      if (active < concurrency) {
        active++;
        run();
      } else {
        queue.push(run);
      }
    });
  };
}

// ---------- main handler ----------
export async function GET(req: Request) {
  const url = new URL(req.url);
  const trainParam = (url.searchParams.get("train") || "").trim();
  const date = (url.searchParams.get("date") || "").trim();
  const boarding = (url.searchParams.get("boarding") || "").trim();

  if (!trainParam || !date || !boarding) {
    return NextResponse.json({ ok: false, error: "missing params: train/date/boarding" }, { status: 400 });
  }

  try {
    const q = trainParam;
    const isDigits = /^[0-9]+$/.test(q);
    let stopsRows: any[] = [];

    // fetch route (full) - keep limit safe
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
      return NextResponse.json({ ok: true, train: { trainNumber: trainParam, trainName: null }, stations: [] });
    }

    // compute arrival dates
    const baseDay = typeof stopsRows[0]?.Day === "number" ? Number(stopsRows[0].Day) : 1;
    const stopsWithArrival = stopsRows.map((s: any) => {
      let arrivalDate = date;
      if (typeof s.Day === "number") {
        const diff = Number(s.Day) - baseDay;
        arrivalDate = addDaysToIso(date, diff);
      }
      return { ...s, arrivalDate };
    });

    // get unique station codes
    const stationCodes = Array.from(
      new Set(
        stopsWithArrival
          .map((s: any) => normalizeCode(s.StationCode ?? s.stationcode ?? s.Station ?? s.station))
          .filter(Boolean),
      ),
    );

    // RestroMaster single IN query
    let restroRows: any[] = [];
    if (stationCodes.length) {
      try {
        const { data, error } = await serviceClient
          .from("RestroMaster")
          .select("RestroCode,RestroName,StationCode,StationName,0penTime,ClosedTime,WeeklyOff,MinimumOrdermValue,CutOffTime,IsActive,RestroDisplayPhoto")
          .in("StationCode", stationCodes)
          .limit(5000);
        if (!error && Array.isArray(data) && data.length) restroRows = data;
      } catch {
        // ignore
      }
    }

    // fallback: if empty, fetch many and filter
    if (!restroRows.length) {
      try {
        const { data: allRestros } = await serviceClient
          .from("RestroMaster")
          .select("RestroCode,RestroName,StationCode,StationName,0penTime,ClosedTime,WeeklyOff,MinimumOrdermValue,CutOffTime,IsActive,RestroDisplayPhoto")
          .limit(5000);
        if (Array.isArray(allRestros)) {
          const lowerCodes = stationCodes.map((c) => c.toLowerCase());
          restroRows = (allRestros || []).filter((r: any) => {
            const rl = normalizeToLower(r);
            const cand = rl.stationcode ?? rl.station_code ?? rl.station ?? rl.stationid ?? rl.stationname ?? null;
            if (!cand) return false;
            return lowerCodes.includes(String(cand).toLowerCase());
          });
        }
      } catch {
        // ignore
      }
    }

    // group restromaster rows by station code
    const grouped: Record<string, any[]> = {};
    for (const r of restroRows) {
      const sc = normalizeCode(r.StationCode ?? r.stationcode ?? r.Station ?? r.station ?? null);
      if (!sc) continue;
      (grouped[sc] = grouped[sc] || []).push(r);
    }

    // map stops by station for representative arrival/time
    const stationMap: Record<string, any[]> = {};
    for (const s of stopsWithArrival) {
      const sc = normalizeCode(s.StationCode ?? s.stationcode ?? s.Station ?? s.station ?? "");
      if (!sc) continue;
      stationMap[sc] = stationMap[sc] || [];
      stationMap[sc].push(s);
    }

    // prepare vendor lists per station (collect vendor ids per date)
    const stationToVendorsRaw: Record<string, { vendors: any[]; arrivalDate: string }> = {};
    const stationsMissingRestroMaster: string[] = [];
    const vendorIdsByDate: Record<string, Set<string | number>> = {};

    for (const sc of stationCodes) {
      const stopList = stationMap[sc] || [];
      const firstStop = stopList[0] || {};
      const arrivalDate = firstStop.arrivalDate || date;
      let vendors: any[] = [];

      if (grouped[sc] && grouped[sc].length) {
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
      }

      if (vendors.length) {
        stationToVendorsRaw[sc] = { vendors, arrivalDate };
        vendorIdsByDate[arrivalDate] = vendorIdsByDate[arrivalDate] || new Set();
        vendors.forEach((v) => vendorIdsByDate[arrivalDate].add(v.RestroCode));
      } else {
        stationsMissingRestroMaster.push(sc);
        stationToVendorsRaw[sc] = { vendors: [], arrivalDate };
      }
    }

    // admin fallback for stations missing restromaster (parallel)
    if (stationsMissingRestroMaster.length) {
      await Promise.all(
        stationsMissingRestroMaster.map(async (sc) => {
          try {
            const adminUrl = `${ADMIN_BASE.replace(/\/$/, "")}/api/stations/${encodeURIComponent(sc)}`;
            const adminJson = await fetchWithTimeout(adminUrl, 800);
            const adminRows = adminJson?.restaurants ?? adminJson?.data ?? adminJson?.rows ?? adminJson ?? null;
            if (Array.isArray(adminRows) && adminRows.length) {
              const mapped = adminRows.map((ar: any) => mapAdminRestroToCommon(ar)).filter((m) => m.isActive !== false);
              stationToVendorsRaw[sc] = stationToVendorsRaw[sc] || { vendors: [], arrivalDate: date };
              stationToVendorsRaw[sc].vendors = mapped;
              const firstStop = stationMap[sc]?.[0] || {};
              const arrivalDate = firstStop.arrivalDate || date;
              vendorIdsByDate[arrivalDate] = vendorIdsByDate[arrivalDate] || new Set();
              mapped.forEach((m) => vendorIdsByDate[arrivalDate].add(m.RestroCode));
            }
          } catch (e) {
            // ignore fallback error
            console.warn("admin fallback failed for", sc, e);
          }
        }),
      );
    }

    // perform holiday checks in parallel with concurrency limit and cached results
    const concurrency = 50; // large but controlled — tune if admin can't handle concurrency
    const limit = pLimit(concurrency);
    const blockedVendorSet = new Set<string | number>();

    const holidayPromises: Promise<void>[] = [];
    for (const isoDate of Object.keys(vendorIdsByDate)) {
      const ids = Array.from(vendorIdsByDate[isoDate] || []);
      for (const id of ids) {
        const p = limit(async () => {
          try {
            const blocked = await isVendorHolidayCached(id, isoDate);
            if (blocked) blockedVendorSet.add(id);
          } catch (e) {
            // ignore per-vendor failure
          }
        });
        holidayPromises.push(p);
      }
    }
    // wait all holiday checks (they will run concurrent up to concurrency)
    await Promise.all(holidayPromises);

    // assemble finalStations (include arrival_time & stoptime & platform)
    const finalStations: any[] = [];
    for (const sc of stationCodes) {
      const repStop = stationMap[sc] && stationMap[sc][0] ? stationMap[sc][0] : null;
      if (!repStop) continue;
      const arrivalDate = repStop.arrivalDate;
      const arrivalTime = repStop.Arrives ?? repStop.Arrival ?? repStop.arrival_time ?? null;
      const stoptime = repStop.Stoptime ?? repStop.stoptime ?? null;
      const platform = repStop.Platform ?? repStop.platform ?? null;
      const day = typeof repStop.Day === "number" ? repStop.Day : repStop.Day ? Number(repStop.Day) : null;

      const rawVendors = (stationToVendorsRaw[sc] && stationToVendorsRaw[sc].vendors) || [];
      const vendorsFiltered = rawVendors
        .filter((v: any) => {
          if (!isActiveValue(v.isActive ?? v.IsActive ?? v.active)) return false;
          const id = v.RestroCode ?? v.RestroCode;
          if (!id) return false;
          if (blockedVendorSet.has(id)) return false;
          return true;
        })
        .map((v: any) => ({
          RestroCode: v.RestroCode ?? v.RestroCode ?? v.id ?? null,
          RestroName: v.RestroName ?? v.RestroName ?? v.name ?? null,
          isActive: v.isActive ?? v.IsActive ?? true,
          OpenTime: v.OpenTime ?? v.openTime ?? null,
          ClosedTime: v.ClosedTime ?? v.closeTime ?? null,
          MinimumOrdermValue: v.MinimumOrdermValue ?? v.minOrder ?? null,
          RestroDisplayPhoto: v.RestroDisplayPhoto ?? v.RestroDisplayPhoto ?? null,
          source: v.source ?? "admin",
          raw: v.raw ?? v,
        }));

      if (vendorsFiltered.length) {
        finalStations.push({
          StationCode: sc,
          StationName: repStop.StationName ?? repStop.stationName ?? repStop.station_name ?? sc,
          arrival_time: arrivalTime,
          stoptime,
          platform,
          Day: day,
          arrival_date: arrivalDate,
          vendors: vendorsFiltered,
        });
      }
    }

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
