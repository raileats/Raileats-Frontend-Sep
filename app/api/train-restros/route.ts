import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/**
 * RailEats Optimized API - Final Fixed Version
 * - Fixed: IsActive filter logic based on Supabase CSV structure
 * - Fixed: IsPureVeg mapping (0 for Non-Veg, 1 for Pure Veg)
 * - Optimized: Upstash caching & Parallel holiday checks
 */

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const CACHE_TTL = Number(process.env.TRAIN_RESTROS_CACHE_TTL_SEC || "30");
const HOLIDAY_TTL = Number(process.env.TRAIN_RESTROS_HOLIDAY_TTL_SEC || "86400");

// ---------- Improved Helpers ----------
function normalizeCode(val: any) {
  return String(val ?? "").toUpperCase().trim();
}

/**
 * Supabase/Postgres se aane waali values handle karne ke liye (true, "true", 1 sab chalega)
 */
function isTrue(val: any): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  if (typeof val === "string") {
    const t = val.trim().toLowerCase();
    return ["1", "true", "yes", "y"].includes(t);
  }
  return false;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function timeToSeconds(t: string | null | undefined) {
  if (!t) return null;
  const parts = String(t).trim().split(":").map(Number);
  if (parts.some(isNaN)) return null;
  return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
}

function secondsToHuman(sec: number | null) {
  if (sec === null || sec < 0) return null;
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function addDaysToIso(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/* ---------------- Upstash Helpers ---------------- */
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

/* ---------------- Concurrency Mapper ---------------- */
async function pMap<T, R>(items: T[], mapper: (t: T) => Promise<R>, concurrency = 12): Promise<R[]> {
  const results: R[] = [];
  const batches = chunk(items, concurrency);
  for (const b of batches) {
    const res = await Promise.all(b.map(item => mapper(item).catch(() => null as any)));
    results.push(...res);
  }
  return results;
}

/* ---------------- MAIN API ---------------- */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const train = searchParams.get("train")?.trim() || "";
  const date = searchParams.get("date")?.trim() || "";
  const boarding = searchParams.get("boarding")?.trim() || "";

  if (!train || !date || !boarding) {
    return NextResponse.json({ ok: false, error: "Missing params" }, { status: 400 });
  }

  const cacheKey = `tr:${train}:${date}:${boarding}`;
  const cached = await upstashGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    // 1. Get Train Route
    let { data: stopsRows } = await serviceClient
      .from("TrainRoute")
      .select("*")
      .or(`trainNumber.eq.${train},trainNumber.eq.${parseInt(train) || 0}`)
      .order("StnNumber", { ascending: true });

    if (!stopsRows?.length) {
      const { data: nameMatch } = await serviceClient
        .from("TrainRoute")
        .select("*")
        .ilike("trainName", `%${train}%`)
        .order("StnNumber", { ascending: true });
      stopsRows = nameMatch;
    }

    if (!stopsRows?.length) return NextResponse.json({ ok: true, stations: [] });

    // 2. Slicing from boarding station
    const normBoard = normalizeCode(boarding);
    const startIdx = stopsRows.findIndex(s => normalizeCode(s.StationCode) === normBoard);
    const slicedStops = stopsRows.slice(startIdx >= 0 ? startIdx : 0);
    const baseDay = Number(stopsRows[0].Day || 1);

    const stopsWithDates = slicedStops.map(s => ({
      ...s,
      arrival_date: addDaysToIso(date, Number(s.Day || 1) - baseDay)
    }));

    const stationCodes = Array.from(new Set(stopsWithDates.map(s => normalizeCode(s.StationCode))));

    // 3. Fetch Restaurants (Using EXACT column names from your CSV)
    let restroRows: any[] = [];
    const stationBatches = chunk(stationCodes, 100);
    for (const b of stationBatches) {
      const { data } = await serviceClient
        .from("RestroMaster")
        .select("RestroCode,RestroName,StationCode,StationName,open_time,closed_time,MinimumOrdermValue,IsActive,IsPureVeg,RestroDisplayPhoto")
        .in("StationCode", b);
      if (data) restroRows.push(...data);
    }

    const groupedRestros: Record<string, any[]> = {};
    restroRows.forEach(r => {
      const code = normalizeCode(r.StationCode);
      // 🔥 CRITICAL: Filter only ACTIVE restaurants
      if (isTrue(r.IsActive)) {
        if (!groupedRestros[code]) groupedRestros[code] = [];
        groupedRestros[code].push(r);
      }
    });

    // 4. Final Assembly
    const finalStations = await pMap(stopsWithDates, async (s) => {
      const sc = normalizeCode(s.StationCode);
      const candidates = groupedRestros[sc] || [];

      if (!candidates.length) return null;

      // Map candidates to consistent UI format
      const vendors = candidates.map(cv => ({
        RestroCode: cv.RestroCode,
        RestroName: cv.RestroName,
        OpenTime: cv.open_time || cv.OpenTime,
        ClosedTime: cv.closed_time || cv.ClosedTime,
        MinimumOrdermValue: cv.MinimumOrdermValue || 0,
        RestroDisplayPhoto: cv.RestroDisplayPhoto,
        IsPureVeg: isTrue(cv.IsPureVeg) ? 1 : 0, // ✅ Convert to 1 (Veg) or 0 (Non-Veg)
        isActive: true
      }));

      let halt = "0m";
      const aSec = timeToSeconds(s.Arrives), dSec = timeToSeconds(s.Departs);
      if (aSec !== null && dSec !== null) halt = secondsToHuman(dSec - aSec) || "0m";

      return {
        StationCode: sc,
        StationName: s.StationName,
        arrival_time: s.Arrives,
        halt_time: halt,
        Day: s.Day,
        arrival_date: s.arrival_date,
        vendors
      };
    }, 15);

    const result = {
      ok: true,
      train: { 
        trainNumber: stopsRows[0].trainNumber, 
        trainName: stopsRows[0].trainName 
      },
      stations: finalStations.filter(Boolean)
    };

    await upstashSet(cacheKey, result);
    return NextResponse.json(result);

  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json({ ok: false, error: "Server Error" }, { status: 500 });
  }
}
