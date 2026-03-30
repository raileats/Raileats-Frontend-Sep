import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

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
  // HH:mm:ss ya HH:mm ko seconds mein convert karta hai
  return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
}

function secondsToHuman(sec: number | null) {
  if (sec === null || sec < 0) return "0m";
  const m = Math.floor(sec / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

// Har station ki date calculate karne ke liye
function addDaysToIso(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trainParam = searchParams.get("train")?.trim() || "";
  const startDate = searchParams.get("date")?.trim() || ""; // Format: YYYY-MM-DD (Train Start Date)
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

    // Current Time in IST (Indian Standard Time)
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istNow = new Date(utcTime + (3600000 * 5.5)); // Current IST Time

    // 2. Slice route from boarding station
    const normBoard = normalize(boarding);
    const bIdx = stopsRows.findIndex(s => normalize(s.StationCode) === normBoard);
    const baseDay = Number(stopsRows[0].Day || 1);
    const activeRoute = bIdx !== -1 ? stopsRows.slice(bIdx) : stopsRows;

    // 3. Fetch Restaurants for all stations in route
    const stationCodes = Array.from(new Set(activeRoute.map(s => normalize(s.StationCode))));
    const { data: restroRows, error: rsErr } = await serviceClient
      .from("RestroMaster")
      .select("*")
      .in("StationCode", stationCodes);

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

    // 4. Process Stations with strict Time & CutOff filters
    const finalStations = activeRoute.map(s => {
      const code = normalize(s.StationCode);
      const vendorsRaw = grouped[code] || [];
      if (vendorsRaw.length === 0) return null;

      // Station ki actual date (Start Date + Day offset)
      const stationDate = addDaysToIso(startDate, Number(s.Day || 1) - baseDay);
      // Station arrival time object
      const arrivalDateTime = new Date(`${stationDate}T${s.Arrives || "00:00:00"}`);

      // Filter vendors based on Current Time and CutOff
      const validVendors = vendorsRaw.map(v => {
        const cutOffMins = Number(v.CutOffTime || 0);
        
        // Time difference in milliseconds
        const timeDiffMs = arrivalDateTime.getTime() - istNow.getTime();
        const timeDiffMins = timeDiffMs / (1000 * 60);

        // CONDITION 1: Agar train ka arrival time nikal gaya hai
        if (timeDiffMs <= 0) return null;

        // CONDITION 2: Agar CutOffTime ka samay nikal gaya hai
        if (timeDiffMins < cutOffMins) return null;

        return {
          RestroCode: v.RestroCode,
          RestroName: v.RestroName,
          RestroRating: v.RestroRating || "0.0", // Rating added
          OpenTime: v.open_time || v.OpenTime || "00:00",
          ClosedTime: v.closed_time || v.ClosedTime || "23:59",
          MinimumOrdermValue: v.MinimumOrderValue || v.MinimumOrdermValue || 0,
          RestroDisplayPhoto: v.RestroDisplayPhoto,
          IsPureVeg: isTrue(v.IsPureVeg) ? 1 : 0,
          isActive: true,
          CutOffTime: cutOffMins
        };
      }).filter(Boolean);

      if (validVendors.length === 0) return null;

      const aSec = timeToSeconds(s.Arrives), dSec = timeToSeconds(s.Departs);
      const halt = (aSec !== null && dSec !== null) ? secondsToHuman(dSec - aSec) : (s.Stoptime || "0m");

      return {
        StationCode: code,
        StationName: s.StationName,
        arrival_time: s.Arrives,
        arrival_date: stationDate, // Har station ki apni date
        halt_time: halt,
        Day: s.Day,
        vendors: validVendors
      };
    }).filter(Boolean);

    return NextResponse.json({
      ok: true,
      train: { 
        trainNumber: stopsRows[0].trainNumber, 
        trainName: stopsRows[0].trainName 
      },
      stations: finalStations
    });

  } catch (err: any) {
    console.error("API Error:", err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
