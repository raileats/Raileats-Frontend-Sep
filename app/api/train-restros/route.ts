import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

// ---------- Helpers ----------
function normalize(val: any) {
  return String(val ?? "").toUpperCase().trim();
}

function isTrue(val: any): boolean {
  if (val === true || val === "true" || val === 1 || val === "1") return true;
  return false;
}

function timeToSeconds(t: string | null | undefined) {
  if (!t) return null;
  const parts = String(t).trim().split(":").map(Number);
  return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
}

function secondsToHuman(sec: number | null) {
  if (sec === null || sec < 0) return "0m";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const train = searchParams.get("train")?.trim() || "";
  const date = searchParams.get("date")?.trim() || "";
  const boarding = searchParams.get("boarding")?.trim() || "";

  console.log(`--- Debug: Fetching for Train: ${train}, Boarding: ${boarding} ---`);

  try {
    // 1. Get Train Route - Sabse pehle train check karte hain
    const { data: stopsRows, error: trainErr } = await serviceClient
      .from("TrainRoute")
      .select("*")
      .or(`trainNumber.eq.${train},trainNumber.eq.${parseInt(train) || 0}`)
      .order("StnNumber", { ascending: true });

    if (trainErr || !stopsRows || stopsRows.length === 0) {
      console.log("❌ Error: Train not found in TrainRoute table");
      return NextResponse.json({ ok: true, stations: [], debug: "Train not found" });
    }

    console.log(`✅ Success: Found ${stopsRows.length} stops for train ${train}`);

    // 2. Filter from Boarding Station
    const normBoard = normalize(boarding);
    const startIdx = stopsRows.findIndex(s => normalize(s.StationCode) === normBoard);
    
    if (startIdx === -1) {
       console.log(`⚠️ Warning: Boarding station ${normBoard} not found in route. Using full route.`);
    }

    const slicedStops = stopsRows.slice(startIdx >= 0 ? startIdx : 0);
    const stationCodes = slicedStops.map(s => normalize(s.StationCode)).filter(Boolean);

    // 3. Fetch All Restaurants for these stations
    const { data: restroRows, error: restroErr } = await serviceClient
      .from("RestroMaster")
      .select("*")
      .in("StationCode", stationCodes);

    if (restroErr) {
      console.log("❌ Error fetching RestroMaster:", restroErr);
      return NextResponse.json({ ok: false, error: "Database error" });
    }

    console.log(`✅ Success: Found ${restroRows?.length || 0} total restaurants for these stations`);

    // 4. Grouping & Filtering (Active only)
    const groupedRestros: Record<string, any[]> = {};
    restroRows?.forEach(r => {
      // CSV ke according PascalCase use kar rahe hain
      const active = r.IsActive ?? r.is_active; 
      const code = normalize(r.StationCode);

      if (isTrue(active)) {
        if (!groupedRestros[code]) groupedRestros[code] = [];
        groupedRestros[code].push(r);
      }
    });

    // 5. Final Output Assembly
    const finalStations = slicedStops.map(s => {
      const sc = normalize(s.StationCode);
      const vendorsRaw = groupedRestros[sc] || [];

      if (vendorsRaw.length === 0) return null;

      const vendors = vendorsRaw.map(v => ({
        RestroCode: v.RestroCode || v.id,
        RestroName: v.RestroName || v.name,
        OpenTime: v.OpenTime || v.open_time,
        ClosedTime: v.ClosedTime || v.closed_time,
        MinimumOrdermValue: v.MinimumOrdermValue || 0,
        RestroDisplayPhoto: v.RestroDisplayPhoto,
        IsPureVeg: isTrue(v.IsPureVeg ?? v.is_pure_veg) ? 1 : 0,
        isActive: true
      }));

      // Halt calculation
      const aSec = timeToSeconds(s.Arrives), dSec = timeToSeconds(s.Departs);
      const halt = (aSec !== null && dSec !== null) ? secondsToHuman(dSec - aSec) : "0m";

      return {
        StationCode: sc,
        StationName: s.StationName,
        arrival_time: s.Arrives,
        halt_time: halt,
        Day: s.Day,
        vendors: vendors
      };
    }).filter(Boolean);

    console.log(`🚀 Final: Returning ${finalStations.length} stations with restaurants`);

    return NextResponse.json({
      ok: true,
      train: { 
        trainNumber: stopsRows[0].trainNumber, 
        trainName: stopsRows[0].trainName 
      },
      stations: finalStations
    });

  } catch (err: any) {
    console.error("🔥 Crash Error:", err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
