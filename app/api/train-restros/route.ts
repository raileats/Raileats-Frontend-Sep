import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

// ---------- Helpers ----------
function normalize(val: any) {
  return String(val ?? "").toUpperCase().trim();
}

// Flexible boolean check for IsActive/IsPureVeg
function isTrue(val: any) {
  if (val === undefined || val === null) return true; // Default to true if column missing
  if (typeof val === "boolean") return val;
  const s = String(val).toLowerCase();
  return ["true", "1", "active", "yes"].includes(s);
}

function timeToSeconds(t: string | null | undefined) {
  if (!t) return null;
  const parts = String(t).trim().split(":").map(Number);
  return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
}

function secondsToHuman(sec: number | null) {
  if (sec === null || sec < 0) return "0m";
  const m = Math.floor(sec / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trainParam = searchParams.get("train")?.trim() || "";
  const date = searchParams.get("date")?.trim() || "";
  const boarding = searchParams.get("boarding")?.trim() || "";

  if (!trainParam || !date || !boarding) {
    return NextResponse.json({ ok: false, error: "Missing params" }, { status: 400 });
  }

  try {
    // 1. Train Route Fetch (Flexible for ID or Number)
    const { data: stopsRows, error: trErr } = await serviceClient
      .from("TrainRoute")
      .select("*")
      .or(`trainNumber.eq.${trainParam},trainNumber.eq.${parseInt(trainParam) || 0}`)
      .order("StnNumber", { ascending: true });

    if (trErr || !stopsRows || stopsRows.length === 0) {
      return NextResponse.json({ ok: true, stations: [] });
    }

    // 2. Slice route from boarding station
    const normBoard = normalize(boarding);
    const bIdx = stopsRows.findIndex(s => normalize(s.StationCode) === normBoard);
    const activeRoute = bIdx !== -1 ? stopsRows.slice(bIdx) : stopsRows;
    const stationCodes = Array.from(new Set(activeRoute.map(s => normalize(s.StationCode))));

    // 3. Fetch Restaurants (Exact CSV Column Names)
    const { data: restroRows, error: rsErr } = await serviceClient
      .from("RestroMaster")
      .select("*") // Fetch all first to avoid column mismatch errors
      .in("StationCode", stationCodes);

    if (rsErr) throw rsErr;

    // 4. Grouping logic
    const grouped: Record<string, any[]> = {};
    restroRows?.forEach(r => {
      // Check if active (flexible check)
      const active = r.IsActive ?? r.is_active ?? r.RaileatsStatus ?? "Active";
      if (isTrue(active)) {
        const sc = normalize(r.StationCode);
        if (!grouped[sc]) grouped[sc] = [];
        
        grouped[sc].push({
          RestroCode: r.RestroCode,
          RestroName: r.RestroName,
          OpenTime: r.open_time || r.OpenTime || "00:00",
          ClosedTime: r.closed_time || r.ClosedTime || "23:59",
          MinimumOrdermValue: r.MinimumOrderValue || r.MinimumOrdermValue || 0, // Fixed 'm' typo
          RestroDisplayPhoto: r.RestroDisplayPhoto,
          IsPureVeg: isTrue(r.IsPureVeg) ? 1 : 0,
          isActive: true
        });
      }
    });

    // 5. Final Assembly
    const finalStations = activeRoute.map(s => {
      const code = normalize(s.StationCode);
      const vendors = grouped[code] || [];
      if (vendors.length === 0) return null;

      const aSec = timeToSeconds(s.Arrives), dSec = timeToSeconds(s.Departs);
      const halt = (aSec !== null && dSec !== null) ? secondsToHuman(dSec - aSec) : (s.Stoptime || "0m");

      return {
        StationCode: code,
        StationName: s.StationName,
        arrival_time: s.Arrives,
        halt_time: halt,
        Day: s.Day,
        vendors
      };
    }).filter(Boolean);

    return NextResponse.json({
      ok: true,
      train: { trainNumber: stopsRows[0].trainNumber, trainName: stopsRows[0].trainName },
      stations: finalStations
    });

  } catch (err: any) {
    console.error("API Error:", err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
