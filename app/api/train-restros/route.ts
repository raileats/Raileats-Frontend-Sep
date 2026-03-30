import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

// Helpers
function normalize(val: any) {
  return String(val ?? "").toUpperCase().trim();
}

/**
 * Robust Boolean Check: Handles TRUE, "true", 1, "1", etc.
 */
function parseBool(val: any): boolean {
  if (val === true || val === 1 || String(val).toLowerCase() === "true" || String(val) === "1") {
    return true;
  }
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
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trainParam = searchParams.get("train")?.trim() || "";
    const date = searchParams.get("date")?.trim() || "";
    const boarding = searchParams.get("boarding")?.trim() || "";

    if (!trainParam || !date || !boarding) {
      return NextResponse.json({ ok: false, error: "Missing required params" }, { status: 400 });
    }

    // 1. Fetch Train Route
    // Hum integer aur string dono check kar rahe hain taaki column type ka issue na ho
    const { data: stopsRows, error: trainErr } = await serviceClient
      .from("TrainRoute")
      .select("*")
      .or(`trainNumber.eq.${trainParam},trainNumber.eq.${parseInt(trainParam) || 0}`)
      .order("StnNumber", { ascending: true });

    if (trainErr || !stopsRows || stopsRows.length === 0) {
      return NextResponse.json({ ok: true, train: { trainNumber: trainParam }, stations: [] });
    }

    // 2. Slice Route from Boarding Station
    const normBoarding = normalize(boarding);
    const boardingIdx = stopsRows.findIndex(s => normalize(s.StationCode) === normBoarding);
    
    // Agar boarding station nahi mila toh full route dikhayenge (Safety Fallback)
    const activeRoute = boardingIdx !== -1 ? stopsRows.slice(boardingIdx) : stopsRows;
    const stationCodes = Array.from(new Set(activeRoute.map(s => normalize(s.StationCode))));

    // 3. Fetch Restaurants (Using exact columns from your CSV)
    const { data: restroRows, error: restroErr } = await serviceClient
      .from("RestroMaster")
      .select("RestroCode,RestroName,StationCode,StationName,open_time,closed_time,MinimumOrdermValue,IsActive,IsPureVeg,RestroDisplayPhoto")
      .in("StationCode", stationCodes);

    if (restroErr) throw restroErr;

    // 4. Group Restaurants by Station and Filter Active
    const groupedVendors: Record<string, any[]> = {};
    restroRows?.forEach(r => {
      if (parseBool(r.IsActive)) { // ✅ Sirf Active restaurants hi jayenge
        const code = normalize(r.StationCode);
        if (!groupedVendors[code]) groupedVendors[code] = [];
        
        groupedVendors[code].push({
          RestroCode: r.RestroCode,
          RestroName: r.RestroName,
          OpenTime: r.open_time || r.OpenTime, // CSV supports lowercase
          ClosedTime: r.closed_time || r.ClosedTime,
          MinimumOrdermValue: r.MinimumOrdermValue || 0,
          RestroDisplayPhoto: r.RestroDisplayPhoto,
          IsPureVeg: parseBool(r.IsPureVeg) ? 1 : 0, // ✅ 1 for Veg, 0 for Non-Veg
          isActive: true
        });
      }
    });

    // 5. Assemble Final Response
    const finalStations = activeRoute.map(s => {
      const code = normalize(s.StationCode);
      const vendors = groupedVendors[code] || [];

      if (vendors.length === 0) return null;

      // Halt calculation
      const aSec = timeToSeconds(s.Arrives);
      const dSec = timeToSeconds(s.Departs);
      const halt = (aSec !== null && dSec !== null) ? secondsToHuman(dSec - aSec) : "0m";

      return {
        StationCode: code,
        StationName: s.StationName,
        arrival_time: s.Arrives,
        halt_time: halt,
        Day: s.Day,
        vendors: vendors
      };
    }).filter(Boolean); // Remove stations with no active vendors

    return NextResponse.json({
      ok: true,
      train: {
        trainNumber: stopsRows[0].trainNumber,
        trainName: stopsRows[0].trainName
      },
      stations: finalStations
    });

  } catch (error: any) {
    console.error("API Error:", error.message);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
