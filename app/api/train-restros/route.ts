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

// Har station ki date calculate karne ke liye (Boarding Date + (Day - BaseDay))
function getStationDate(startDateStr: string, stationDay: number, baseDay: number) {
  const d = new Date(startDateStr + "T00:00:00");
  const diff = stationDay - baseDay;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trainParam = searchParams.get("train")?.trim() || "";
  const startDateParam = searchParams.get("date")?.trim() || ""; // E.g. 2026-03-28
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

    // --- IST TIME CALCULATION ---
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
    console.log("Current IST Time:", istNow.toISOString());

    // 2. Filter Route from Boarding
    const normBoard = normalize(boarding);
    const bIdx = stopsRows.findIndex(s => normalize(s.StationCode) === normBoard);
    const baseDay = Number(stopsRows[0].Day || 1);
    
    // Agar boarding point se aage ka data chahiye
    const activeRoute = bIdx !== -1 ? stopsRows.slice(bIdx) : stopsRows;
    const stationCodes = Array.from(new Set(activeRoute.map(s => normalize(s.StationCode))));

    // 3. Fetch Restaurants
    const { data: restroRows, error: rsErr } = await serviceClient
      .from("RestroMaster")
      .select("*")
      .in("StationCode", stationCodes);

    if (rsErr) throw rsErr;

    const grouped: Record<string, any[]> = {};
    restroRows?.forEach(r => {
      const status = r.RaileatsStatus ?? r.IsActive ?? "Active";
      if (isTrue(status)) {
        const sc = normalize(r.StationCode);
        if (!grouped[sc]) grouped[sc] = [];
        grouped[sc].push(r);
      }
    });

    // 4. Processing with Strict Past-Time Filter
    const finalStations = activeRoute.map(s => {
      const code = normalize(s.StationCode);
      const vendorsRaw = grouped[code] || [];
      if (vendorsRaw.length === 0) return null;

      // Station ki date aur exact arrival time nikalna
      const sDate = getStationDate(startDateParam, Number(s.Day || 1), baseDay);
      const arrivalDateTime = new Date(`${sDate}T${s.Arrives || "00:00:00"}`);

      // --- FILTER: Agar Arrival Time IST Now se peeche hai toh station skip ---
      if (arrivalDateTime.getTime() <= istNow.getTime()) {
        return null; 
      }

      const validVendors = vendorsRaw.map(v => {
        const cutOffMins = Number(v.CutOffTime || 0);
        const timeDiffMins = (arrivalDateTime.getTime() - istNow.getTime()) / (1000 * 60);

        // --- FILTER: CutOff Time Check ---
        if (timeDiffMins < cutOffMins) return null;

        return {
          RestroCode: v.RestroCode,
          RestroName: v.RestroName,
          // UI Fix: Rating ko float mein convert karke bhejna safe rehta hai
          RestroRating: v.RestroRating ? String(v.RestroRating) : "4.0", 
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
        StationCode: code,
        StationName: s.StationName,
        arrival_time: s.Arrives,
        arrival_date: sDate, // Updated station wise date
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
