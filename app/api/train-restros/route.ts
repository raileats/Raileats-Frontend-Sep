import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

// ---------- Helpers ----------
function normalize(val: any) {
  return String(val ?? "").toUpperCase().trim();
}

function isTrue(val: any) {
  if (val === undefined || val === null) return true;
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

// ✅ Correct station date calculator
function getStationDate(startDateStr: string, stationDay: number, baseDay: number) {
  const d = new Date(startDateStr + "T00:00:00");
  const diff = stationDay - baseDay;
  d.setDate(d.getDate() + diff);
  return d;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const trainParam = searchParams.get("train")?.trim() || "";
  const startDateParam = searchParams.get("date")?.trim() || ""; // E.g., 2026-03-30
  const boarding = searchParams.get("boarding")?.trim() || "";

  if (!trainParam || !startDateParam || !boarding) {
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

    // ✅ CURRENT IST TIME (Hard Fixed)
    const now = new Date();
    const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

    // 2. Slicing logic
    const normBoard = normalize(boarding);
    const bIdx = stopsRows.findIndex(s => normalize(s.StationCode) === normBoard);
    const baseDay = Number(stopsRows[0].Day || 1);

    const activeRoute = bIdx !== -1 ? stopsRows.slice(bIdx) : stopsRows;
    const stationCodes = Array.from(new Set(activeRoute.map(s => normalize(s.StationCode))));

    // 3. Restaurants Fetch
    const { data: restroRows, error: rsErr } = await serviceClient
      .from("RestroMaster")
      .select("*")
      .in("StationCode", stationCodes);

    if (rsErr) throw rsErr;

    const grouped: Record<string, any[]> = {};
    restroRows?.forEach(r => {
      if (isTrue(r.RaileatsStatus ?? r.IsActive)) {
        const sc = normalize(r.StationCode);
        if (!grouped[sc]) grouped[sc] = [];
        grouped[sc].push(r);
      }
    });

    // 4. FINAL PROCESS WITH SMART DATE FILTER
    const finalStations = activeRoute.map(s => {
      const code = normalize(s.StationCode);
      const vendorsRaw = grouped[code] || [];
      if (vendorsRaw.length === 0) return null;

      // Har station ki apni sahi date (Based on Day 1, Day 2 etc)
      const stationDateObj = getStationDate(startDateParam, Number(s.Day || 1), baseDay);
      const arrivalDateTime = new Date(stationDateObj);
      const [h, m, sec] = (s.Arrives || "00:00:00").split(":").map(Number);
      arrivalDateTime.setHours(h, m, sec || 0);

      // ❌ [FIXED LOGIC]: Compare Station's exact Arrival with IST Now
      // Agar ye station ka arrival time nikal chuka hai, toh hide karo
      if (arrivalDateTime <= istNow) {
        return null;
      }

      const validVendors = vendorsRaw.map(v => {
        const cutOff = Number(v.CutOffTime || 0);
        const diffMin = (arrivalDateTime.getTime() - istNow.getTime()) / (1000 * 60);

        // ❌ [FIXED LOGIC]: CutOff check strictly based on Arrival Time
        if (diffMin < cutOff) return null;

        return {
          RestroCode: v.RestroCode,
          RestroName: v.RestroName,
          RestroRating: Number(v.RestroRating || 4), 
          OpenTime: v.open_time || v.OpenTime || "00:00",
          ClosedTime: v.closed_time || v.ClosedTime || "23:59",
          MinimumOrdermValue: v.MinimumOrderValue || 0,
          RestroDisplayPhoto: v.RestroDisplayPhoto,
          IsPureVeg: isTrue(v.IsPureVeg) ? 1 : 0,
          isActive: true
        };
      }).filter(Boolean);

      if (validVendors.length === 0) return null;

      const aSec = timeToSeconds(s.Arrives);
      const dSec = timeToSeconds(s.Departs);
      const halt = (aSec !== null && dSec !== null) ? secondsToHuman(dSec - aSec) : (s.Stoptime || "0m");

      return {
        StationCode: code,
        StationName: s.StationName,
        arrival_time: s.Arrives,
        arrival_date: stationDateObj.toISOString().split("T")[0],
        halt_time: halt,
        Day: s.Day,
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
