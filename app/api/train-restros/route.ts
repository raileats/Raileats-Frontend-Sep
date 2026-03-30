import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/**
 * RailEats Professional API
 * - Deep Read Fix: Column names (IsActive, IsPureVeg, open_time) matched to Supabase CSV.
 * - Logic: Upstash caching, Admin Fallback, and Holiday filtering preserved.
 */

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const CACHE_TTL = Number(process.env.TRAIN_RESTROS_CACHE_TTL_SEC || "30");
const HOLIDAY_TTL = Number(process.env.TRAIN_RESTROS_HOLIDAY_TTL_SEC || "86400");

// ---------- Utils ----------
function normalizeCode(val: any) {
  return String(val ?? "").toUpperCase().trim();
}

/**
 * Handles different boolean formats from Supabase (TRUE, 1, "true")
 */
function isActiveValue(val: any) {
  if (val === true || val === 1 || String(val).toLowerCase() === "true" || String(val) === "1") {
    return true;
  }
  return false;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchJson(url: string, opts?: RequestInit, timeoutMs = 6000): Promise<any | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const r = await fetch(url, { ...opts, signal: controller.signal, cache: "no-store" });
    clearTimeout(id);
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

function timeToSeconds(t: string | null | undefined) {
  if (!t) return null;
  const parts = String(t).trim().split(":").map(Number);
  if (parts.some(isNaN)) return null;
  return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
}

function secondsToHuman(sec: number | null) {
  if (sec === null || sec < 0) return "0m";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function addDaysToIso(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/* ---------------- Upstash REST ---------------- */
async function upstashGet(key: string) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  try {
    const res = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const j = await res.json();
    return j?.result ? JSON.parse(j.result) : null;
  } catch { return null; }
}

async function upstashSet(key: string, value: any, ex = CACHE_TTL) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;
  try {
    await fetch(`${UPSTASH_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}?ex=${ex}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
  } catch {}
}

/* ---------------- Holiday Filter ---------------- */
async function getVendorHolidaysCached(restroCode: string) {
  const key = `hols:${restroCode}`;
  const cached = await upstashGet(key);
  if (cached) return cached;
  try {
    const rows = await fetchJson(`${ADMIN_BASE}/api/restros/${restroCode}/holidays`);
    const data = rows?.rows || rows?.data || (Array.isArray(rows) ? rows : []);
    await upstashSet(key, data, HOLIDAY_TTL);
    return data;
  } catch { return []; }
}

function isHolidayBlocking(rows: any[], isoDate: string) {
  if (!rows?.length) return false;
  const target = Date.parse(isoDate + "T00:00:00");
  return rows.some(r => {
    if (r.deleted_at) return false;
    const s = Date.parse(r.start_at), e = Date.parse(r.end_at);
    return target >= s && target <= e;
  });
}

/* ---------------- Main Handler ---------------- */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trainParam = searchParams.get("train")?.trim() || "";
  const date = searchParams.get("date")?.trim() || "";
  const boarding = searchParams.get("boarding")?.trim() || "";

  if (!trainParam || !date || !boarding) {
    return NextResponse.json({ ok: false, error: "Missing params" }, { status: 400 });
  }

  const cacheKey = `tr:${trainParam}:${date}:${boarding}`;
  const cached = await upstashGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    // 1. Get Train Route
    const { data: stopsRows } = await serviceClient
      .from("TrainRoute")
      .select("*")
      .or(`trainNumber.eq.${trainParam},trainNumber.eq.${parseInt(trainParam) || 0}`)
      .order("StnNumber", { ascending: true });

    if (!stopsRows?.length) return NextResponse.json({ ok: true, stations: [] });

    // 2. Slice from boarding
    const normBoard = normalizeCode(boarding);
    const startIdx = stopsRows.findIndex(s => normalizeCode(s.StationCode) === normBoard);
    const slicedStops = stopsRows.slice(startIdx >= 0 ? startIdx : 0);

    const baseDay = Number(stopsRows[0].Day || 1);
    const stopsWithDates = slicedStops.map(s => ({
      ...s,
      arrivalDate: addDaysToIso(date, Number(s.Day || 1) - baseDay)
    }));

    const stationCodes = Array.from(new Set(stopsWithDates.map(s => normalizeCode(s.StationCode))));

    // 3. Batched RestroMaster Fetch (Exact columns from your CSV)
    let restroRows: any[] = [];
    const batches = chunk(stationCodes, 100);
    for (const b of batches) {
      const { data } = await serviceClient
        .from("RestroMaster")
        .select("RestroCode,RestroName,StationCode,StationName,open_time,closed_time,MinimumOrdermValue,IsActive,IsPureVeg,RestroDisplayPhoto")
        .in("StationCode", b);
      if (data) restroRows.push(...data);
    }

    const grouped: Record<string, any[]> = {};
    restroRows.forEach(r => {
      if (isActiveValue(r.IsActive)) {
        const sc = normalizeCode(r.StationCode);
        if (!grouped[sc]) grouped[sc] = [];
        grouped[sc].push(r);
      }
    });

    // 4. Admin Fallback for missing stations
    const missing = stationCodes.filter(sc => !grouped[sc]);
    if (missing.length > 0) {
      await Promise.allSettled(missing.map(async sc => {
        const json = await fetchJson(`${ADMIN_BASE}/api/stations/${sc}`);
        if (json?.vendors) grouped[sc] = json.vendors;
      }));
    }

    // 5. Final Assembly with Holiday Filter
    const finalStations = await Promise.all(stopsWithDates.map(async (s) => {
      const sc = normalizeCode(s.StationCode);
      const candidates = grouped[sc] || [];
      if (!candidates.length) return null;

      const vendors = await Promise.all(candidates.map(async (cv) => {
        const hols = await getVendorHolidaysCached(String(cv.RestroCode));
        if (isHolidayBlocking(hols, s.arrivalDate)) return null;

        return {
          RestroCode: cv.RestroCode,
          RestroName: cv.RestroName,
          OpenTime: cv.open_time || cv.OpenTime,
          ClosedTime: cv.closed_time || cv.ClosedTime,
          MinimumOrdermValue: cv.MinimumOrdermValue || 0,
          RestroDisplayPhoto: cv.RestroDisplayPhoto,
          IsPureVeg: isActiveValue(cv.IsPureVeg) ? 1 : 0,
          isActive: true
        };
      }));

      const validVendors = vendors.filter(Boolean);
      if (!validVendors.length) return null;

      // Halt calculation
      const aSec = timeToSeconds(s.Arrives), dSec = timeToSeconds(s.Departs);
      const halt = (aSec !== null && dSec !== null) ? secondsToHuman(dSec - aSec) : "0m";

      return {
        StationCode: sc,
        StationName: s.StationName,
        arrival_time: s.Arrives,
        halt_time: halt,
        Day: s.Day,
        arrival_date: s.arrivalDate,
        vendors: validVendors
      };
    }));

    const result = {
      ok: true,
      train: { trainNumber: stopsRows[0].trainNumber, trainName: stopsRows[0].trainName },
      stations: finalStations.filter(Boolean)
    };

    await upstashSet(cacheKey, result);
    return NextResponse.json(result);

  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status: 500 });
  }
}
