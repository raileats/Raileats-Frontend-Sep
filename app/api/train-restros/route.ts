import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

// ---------- Helpers ----------
function normalize(val: any) {
  return String(val ?? "").toUpperCase().trim();
}

function isTrue(val: any) {
  if (val === undefined || val === null) return true;
  if (typeof val === "boolean") return val;
  const s = String(val).toLowerCase();
  return ["true", "1", "active", "yes"].includes(s);
}

function timeToSeconds(t: string | null | undefined) {
  if (!t) return null;
  const parts = String(t).trim().split(":").map(Number);
  // Expected format HH:mm:ss or HH:mm
  return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
}

function secondsToHuman(sec: number | null) {
  if (sec === null || sec < 0) return "0m";
  const m = Math.floor(sec / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

// Date calculation helper
function addDaysToIso(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trainParam = searchParams.get("train")?.trim() || "";
  const startDate = searchParams.get("date")?.trim() || ""; // Format: YYYY-MM-DD
  const boarding = searchParams.get("boarding")?.trim() || "";

  if (!trainParam || !startDate || !boarding) {
    return NextResponse.json({ ok: false, error: "Missing params" }, { status: 400 });
  }

  try {
    // 1. Train Route Fetch
    const { data: stopsRows, error: trErr } = await serviceClient
      .from("TrainRoute")
      .select("*")
      .or(`trainNumber.eq.${trainParam},trainNumber.eq.${parseInt(trainParam) || 0}`)
      .order("StnNumber", { ascending: true });

    if (trErr || !stopsRows || stopsRows.length === 0) {
      return NextResponse.json({ ok: true, stations: [] });
    }

    // 2. Filter logic for Boarding and Current Time
    const normBoard = normalize(boarding);
    const bIdx = stopsRows.findIndex(s => normalize(s.StationCode) === normBoard);
    const baseDay = Number(stopsRows[0].Day || 1);
    
    // Current Indian Time (assuming server is synced or use offset)
    const now = new Date(); 
    // IST Adjustment (Optional: Adjust based on your server location)
    // const nowIST = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000)); 

    const activeRoute = bIdx !== -1 ? stopsRows.slice(bIdx) : stopsRows;

    // 3. Prepare Station Codes and Date-Time info
    const stationCodes: string[] = [];
    const routeWithTimestamps = activeRoute.map(s => {
      const code = normalize(s.StationCode);
      stationCodes.push(code);

      // Calculate the actual arrival date at this station
      const stationArrivalDate = addDaysToIso(startDate, Number(s.Day || 1) - baseDay);
      
      // Combine Date + Arrival Time (Arrives format: "HH:mm:ss")
      const arrivalDateTime = new Date(`${stationArrivalDate}T${s.Arrives || "00:00:00"}`);

      return { ...s, stationArrivalDate, arrivalDateTime, code };
    });

    // 4. Fetch Restaurants
    const { data: restroRows, error: rsErr } = await serviceClient
      .from("RestroMaster")
      .select("*")
      .in("StationCode", Array.from(new Set(stationCodes)));

    if (rsErr) throw rsErr;

    const grouped: Record<string, any[]> = {};
    restroRows?.forEach(r => {
      const active = r.IsActive ?? r.is_active ?? r.RaileatsStatus ?? "Active";
      if (isTrue(active)) {
        const sc = normalize(r.StationCode);
        if (!grouped[sc]) grouped[sc] = [];
        grouped[sc].push(r);
      }
    });

    // 5. Final Assembly with Time & CutOff Logic
    const finalStations = routeWithTimestamps.map(s => {
      const vendorsRaw = grouped[s.code] || [];
      if (vendorsRaw.length === 0) return null;

      // Filter vendors based on CutOffTime and Past Time
      const validVendors = vendorsRaw.map(v => {
        const cutOffMins = Number(v.CutOffTime || 0);
        const arrivalTime = s.arrivalDateTime.getTime();
        const currentTime = now.getTime();

        // Check 1: Agar train nikal chuki hai (Current Time > Arrival Time)
        if (currentTime >= arrivalTime) return null;

        // Check 2: CutOffTime logic (Difference in minutes)
        const diffInMins = (arrivalTime - currentTime) / (1000 * 60);
        if (diffInMins < cutOffMins) return null;

        return {
          RestroCode: v.RestroCode,
          RestroName: v.RestroName,
          RestroRating: v.RestroRating || v.rating || "0.0", // Added Rating
          OpenTime: v.open_time || v.OpenTime || "00:00",
          ClosedTime: v.closed_time || v.ClosedTime || "23:59",
          MinimumOrdermValue: v.MinimumOrderValue || v.MinimumOrdermValue || 0,
          RestroDisplayPhoto: v.RestroDisplayPhoto,
          IsPureVeg: isTrue(v.IsPureVeg) ? 1 : 0,
          isActive: true
        };
      }).filter(Boolean);

      if (validVendors.length === 0) return null;

      const aSec = timeToSeconds(s.Arrives), dSec = timeToSeconds(s.Departs);
      const halt = (aSec !== null && dSec !== null) ? secondsToHuman(dSec - aSec) : (s.Stoptime || "0m");

      return {
        StationCode: s.code,
        StationName: s.StationName,
        arrival_time: s.Arrives,
        halt_time: halt,
        Day: s.Day,
        arrival_date: s.stationArrivalDate, // Dynamic date per station
        vendors: validVendors
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
