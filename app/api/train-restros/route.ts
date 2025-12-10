// app/api/train-restros/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/**
 * train-restros endpoint (production)
 * - Uses TrainRoute to read stops (ordered by StnNumber)
 * - Prefers RestroMaster rows for stations
 * - Falls back to ADMIN stations API when RestroMaster has no rows for a station
 *
 * Minimal change: vendors are filtered by whether they have an active holiday on the station's arrivalDate.
 */

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

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
async function fetchJson(url: string) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch {
    return null;
  }
}

/** helper: add days to ISO yyyy-mm-dd */
function addDaysToIso(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Check if vendor has a holiday covering the given ISO date (yyyy-mm-dd).
 * Uses admin endpoint: /api/restros/{restroCode}/holidays
 * Returns true if vendor is blocked on that date.
 */
async function isVendorHoliday(restroCode: string | number, isoDate: string) {
  try {
    if (!restroCode) return false;
    const url = `${ADMIN_BASE.replace(/\/$/, "")}/api/restros/${encodeURIComponent(String(restroCode))}/holidays`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return false;
    const json = await res.json().catch(() => null);
    const rows: any[] = json?.rows ?? json?.data ?? (Array.isArray(json) ? json : []);
    if (!Array.isArray(rows) || rows.length === 0) return false;

    const target = Date.parse(isoDate + "T00:00:00");
    if (!Number.isFinite(target)) return false;

    for (const r of rows) {
      // ignore logically deleted holidays
      const deletedAt = r?.deleted_at ? Date.parse(r.deleted_at) : null;
      if (deletedAt) continue;

      const start = r?.start_at ? Date.parse(r.start_at) : NaN;
      const end = r?.end_at ? Date.parse(r.end_at) : NaN;
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      if (start <= target && target <= end) return true;
    }
    return false;
  } catch (e) {
    // if holiday check fails, conservatively treat as NOT blocked (so we don't hide vendors incorrectly)
    console.warn("holiday check failed for", restroCode, e);
    return false;
  }
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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const trainParam = (url.searchParams.get("train") || "").trim();
  const date = (url.searchParams.get("date") || "").trim(); // required - base journey date (yyyy-mm-dd)
  const boarding = (url.searchParams.get("boarding") || "").trim();

  if (!trainParam || !date || !boarding) {
    return NextResponse.json({ ok: false, error: "missing params: train/date/boarding" }, { status: 400 });
  }

  try {
    // 1) fetch train stops from TrainRoute (order by StnNumber)
    const q = trainParam;
    const isDigits = /^[0-9]+$/.test(q);
    let stopsRows: any[] = [];

    if (isDigits) {
      const { data: exactData, error: exactErr } = await serviceClient
        .from("TrainRoute")
        .select("StnNumber,StationCode,StationName,Arrives,Departs,Day,Platform,Distance,trainNumber,trainName,runningDays")
        .eq("trainNumber", Number(q))
        .order("StnNumber", { ascending: true })
        .limit(1000);

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
          .limit(1000);
        if (Array.isArray(partialData) && partialData.length) stopsRows = partialData;
      } catch {
        // ignore
      }
    }

    if (!stopsRows.length) {
      return NextResponse.json({ ok: true, train: { trainNumber: trainParam, trainName: null }, stations: [] });
    }

    // compute candidate stops from boarding onward
    const normBoard = normalizeCode(boarding);
    const startIdx = stopsRows.findIndex((r: any) =>
      normalizeCode(r.StationCode ?? r.stationcode ?? r.Station ?? r.station) === normBoard
    );
    const sliceStart = startIdx >= 0 ? startIdx : 0;
    const CAND_LIMIT = 12;
    const candidateStops = stopsRows.slice(sliceStart, sliceStart + CAND_LIMIT);

    // compute arrivalDate for each candidate stop using Day offset relative to first row's Day and the requested date
    // If Day exists on rows use it otherwise assume same day.
    const baseDay = typeof stopsRows[0]?.Day === "number" ? Number(stopsRows[0].Day) : 1;
    const stopsWithArrival = candidateStops.map((s: any) => {
      let arrivalDate = date; // default
      if (typeof s.Day === "number") {
        const diff = Number(s.Day) - baseDay;
        arrivalDate = addDaysToIso(date, diff);
      }
      return { ...s, arrivalDate };
    });

    const stationCodes = stopsWithArrival.map((s: any) => normalizeCode(s.StationCode ?? s.stationcode ?? s.Station ?? s.station)).filter(Boolean);

    // 2) fast path: RestroMaster .in("StationCode", stationCodes)
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
        // ignore and fallback below
      }
    }

    // fallback: fetch many and filter client-side if restroRows is empty
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

    // group RestroMaster rows by normalized StationCode
    const grouped: Record<string, any[]> = {};
    for (const r of restroRows) {
      const sc = normalizeCode(r.StationCode ?? r.stationcode ?? r.Station ?? r.station ?? null);
      if (!sc) continue;
      (grouped[sc] = grouped[sc] || []).push(r);
    }

    // 3) assemble final stations: prefer restromaster vendors, fallback to admin stations API
    const finalStations: any[] = [];
    for (const s of stopsWithArrival) {
      const sc = normalizeCode(s.StationCode ?? s.stationcode ?? s.Station ?? s.station ?? "");
      if (!sc) continue;
      const stationName = s.StationName ?? s.stationName ?? s.station_name ?? s.station ?? sc;
      const arrivalDate = s.arrivalDate; // yyyy-mm-dd
      let vendors: any[] = [];

      // use RestroMaster vendors first; filter by active flag AND holiday on arrivalDate
      if (grouped[sc] && Array.isArray(grouped[sc])) {
        const arr = [];
        for (const r of grouped[sc]) {
          try {
            const activeFlag = r.IsActive ?? r.isActive ?? r.active;
            if (!isActiveValue(activeFlag)) continue;

            // holiday check: exclude vendor if holiday covers arrivalDate
            const restroId = r.RestroCode ?? r.restroCode ?? r.id ?? null;
            const holidayBlocked = await isVendorHoliday(restroId, arrivalDate);
            if (holidayBlocked) continue;

            arr.push({
              RestroCode: r.RestroCode ?? r.restroCode ?? r.id ?? null,
              RestroName: r.RestroName ?? r.restroName ?? r.name ?? null,
              isActive: r.IsActive ?? r.isActive ?? true,
              OpenTime: r["0penTime"] ?? r.openTime ?? null,
              ClosedTime: r.ClosedTime ?? r.closeTime ?? null,
              MinimumOrdermValue: r.MinimumOrdermValue ?? r.minOrder ?? null,
              RestroDisplayPhoto: r.RestroDisplayPhoto ?? null,
              source: "restromaster",
              raw: r,
            });
          } catch (e) {
            console.warn("vendor-check-restromaster failed", e);
            continue;
          }
        }
        vendors = arr;
      }

      // admin fallback if none (and also filter holidays)
      if (!vendors.length) {
        try {
          const adminUrl = `${ADMIN_BASE.replace(/\/$/, "")}/api/stations/${encodeURIComponent(sc)}`;
          const adminJson = await fetchJson(adminUrl);
          const adminRows = adminJson?.restaurants ?? adminJson?.data ?? adminJson?.rows ?? adminJson ?? null;
          if (Array.isArray(adminRows) && adminRows.length) {
            const arr: any[] = [];
            for (const ar of adminRows) {
              const mapped = mapAdminRestroToCommon(ar);
              if (!mapped.isActive) continue;
              const restroId = mapped.RestroCode ?? null;
              const holidayBlocked = await isVendorHoliday(restroId, arrivalDate);
              if (holidayBlocked) continue;
              arr.push({ ...mapped, source: "admin" });
            }
            vendors = arr;
          }
        } catch (e) {
          // ignore admin fallback errors
          console.warn("admin fallback failed for", sc, e);
        }
      }

      // push only if vendors exist (keeps behavior similar to prior)
      if (vendors.length) {
        finalStations.push({
          StationCode: sc,
          StationName: stationName,
          arrival_time: s.Arrives ?? s.Arrival ?? s.arrival_time ?? null,
          Day: typeof s.Day === "number" ? s.Day : (s.Day ? Number(s.Day) : null),
          arrival_date: arrivalDate, // NEW: station-specific arrival date
          vendors,
        });
      }
    }

    // 4) train meta best-effort
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
