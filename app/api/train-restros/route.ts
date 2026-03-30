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
  return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
}

function secondsToHuman(sec: number | null) {
  if (sec === null || sec < 0) return "0m";
  const m = Math.floor(sec / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ✅ Past station check
function isPastStation(arrivalTime: string, date: string, day: number = 1) {
  try {
    const now = new Date();

    const selectedDate = new Date(date);
    const today = new Date();

    // ✅ अगर selected date future है → kuch skip mat karo
    if (selectedDate > new Date(today.toDateString())) {
      return false;
    }

    const stationTime = new Date(`${date}T${arrivalTime}`);
    stationTime.setDate(stationTime.getDate() + (day - 1));

    return stationTime < now;
  } catch {
    return false;
  }
}

// ✅ Cutoff check
function isCutoffPassed(arrivalTime: string, cutoffMin: number, date: string, day: number = 1) {
  try {
    const now = new Date();

    const selectedDate = new Date(date);
    const today = new Date();

    // ✅ future date → cutoff ignore
    if (selectedDate > new Date(today.toDateString())) {
      return false;
    }

    const arrival = new Date(`${date}T${arrivalTime}`);
    arrival.setDate(arrival.getDate() + (day - 1));

    const diffMin = (arrival.getTime() - now.getTime()) / (1000 * 60);

    return diffMin < cutoffMin;
  } catch {
    return false;
  }
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
    // 1. Train route
    const { data: stopsRows, error: trErr } = await serviceClient
      .from("TrainRoute")
      .select("*")
      .or(`trainNumber.eq.${trainParam},trainNumber.eq.${parseInt(trainParam) || 0}`)
      .order("StnNumber", { ascending: true });

    if (trErr || !stopsRows || stopsRows.length === 0) {
      return NextResponse.json({ ok: true, stations: [] });
    }

    // 2. Slice from boarding
    const normBoard = normalize(boarding);
    const bIdx = stopsRows.findIndex(s => normalize(s.StationCode) === normBoard);
    const activeRoute = bIdx !== -1 ? stopsRows.slice(bIdx) : stopsRows;

    const stationCodes = Array.from(new Set(activeRoute.map(s => normalize(s.StationCode))));

    // 3. Fetch restaurants
    const { data: restroRows, error: rsErr } = await serviceClient
      .from("RestroMaster")
      .select("*")
      .in("StationCode", stationCodes);

    if (rsErr) throw rsErr;

    // 4. Grouping
    const grouped: Record<string, any[]> = {};

    restroRows?.forEach(r => {
      const active = r.IsActive ?? r.is_active ?? r.RaileatsStatus ?? "Active";

      if (isTrue(active)) {
        const sc = normalize(r.StationCode);

        if (!grouped[sc]) grouped[sc] = [];

        grouped[sc].push({
          RestroCode: r.RestroCode,
          RestroName: r.RestroName,
          RestroRating: r.RestroRating ?? r.rating ?? 0, // ✅ added
          OpenTime: r.open_time || r.OpenTime || "00:00",
          ClosedTime: r.closed_time || r.ClosedTime || "23:59",
          MinimumOrdermValue: r.MinimumOrderValue || r.MinimumOrdermValue || 0,
          RestroDisplayPhoto: r.RestroDisplayPhoto,
          CutOffTime: r.CutOffTime ?? 0,
          IsPureVeg: isTrue(r.IsPureVeg) ? 1 : 0,
          isActive: true
        });
      }
    });

    // 5. Final stations
    const finalStations = activeRoute.map(s => {
      const code = normalize(s.StationCode);

      // ❌ skip past station
      if (isPastStation(s.Arrives, date, s.Day)) return null;

      let vendors = grouped[code] || [];

      // ❌ apply cutoff filter
      vendors = vendors.filter(v => {
        return !isCutoffPassed(s.Arrives, v.CutOffTime || 0, date, s.Day);
      });

      if (vendors.length === 0) return null;

      const aSec = timeToSeconds(s.Arrives);
      const dSec = timeToSeconds(s.Departs);

      const halt =
        aSec !== null && dSec !== null
          ? secondsToHuman(dSec - aSec)
          : s.Stoptime || "0m";

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
