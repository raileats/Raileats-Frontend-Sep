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

// Time string "14:30:00" -> Seconds
function timeToSeconds(t: string | null | undefined) {
  if (!t) return 0;
  const parts = String(t).trim().split(":").map(Number);
  return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
}

function secondsToHuman(sec: number | null) {
  if (sec === null || sec < 0) return "0m";
  const m = Math.floor(sec / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

// IST Date/Time Calculation (Strict)
function getISTNow() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 5.5));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trainParam = searchParams.get("train")?.trim() || "";
  const startDateStr = searchParams.get("date")?.trim() || ""; // Format: 2026-03-28
  const boarding = searchParams.get("boarding")?.trim() || "";

  if (!trainParam || !startDateStr || !boarding) {
    return NextResponse.json({ ok: false, error: "Params missing" }, { status: 400 });
  }

  try {
    // 1. Train Route
    const { data: stopsRows } = await serviceClient
      .from("TrainRoute")
      .select("*")
      .or(`trainNumber.eq.${trainParam},trainNumber.eq.${parseInt(trainParam) || 0}`)
      .order("StnNumber", { ascending: true });

    if (!stopsRows?.length) return NextResponse.json({ ok: true, stations: [] });

    const istNow = getISTNow();
    const baseDay = Number(stopsRows[0].Day || 1);

    // 2. Filter Route from Boarding
    const normBoard = normalize(boarding);
    const bIdx = stopsRows.findIndex(s => normalize(s.StationCode) === normBoard);
    const activeRoute = bIdx !== -1 ? stopsRows.slice(bIdx) : stopsRows;
    const stationCodes = Array.from(new Set(activeRoute.map(s => normalize(s.StationCode))));

    // 3. Restaurants Fetch
    const { data: restroRows } = await serviceClient
      .from("RestroMaster")
      .select("*")
      .in("StationCode", stationCodes);

    const grouped: Record<string, any[]> = {};
    restroRows?.forEach(r => {
      if (isTrue(r.RaileatsStatus || r.IsActive)) {
        const sc = normalize(r.StationCode);
        if (!grouped[sc]) grouped[sc] = [];
        grouped[sc].push(r);
      }
    });

    // 4. Processing with Strict "Passed Station" & "Cutoff" Filter
    const finalStations = activeRoute.map(s => {
      const code = normalize(s.StationCode);
      const vendorsRaw = grouped[code] || [];
      if (vendorsRaw.length === 0) return null;

      // Calculate Station Arrival Date based on Day
      const sDate = new Date(startDateStr + "T00:00:00");
      sDate.setDate(sDate.getDate() + (Number(s.Day || 1) - baseDay));
      
      const arrivalDateTime = new Date(`${sDate.toISOString().split('T')[0]}T${s.Arrives || "00:00:00"}`);

      // --- CRITICAL FILTER 1: Past Station Check ---
      // Agar station ke aane ka waqt (arrivalDateTime) abhi ke waqt (istNow) se kam hai
      if (arrivalDateTime.getTime() <= istNow.getTime()) {
        return null; 
      }

      const validVendors = vendorsRaw.map(v => {
        const cutOffMins = Number(v.CutOffTime || 0);
        const diffMins = (arrivalDateTime.getTime() - istNow.getTime()) / (1000 * 60);

        // --- CRITICAL FILTER 2: CutOff Check ---
        if (diffMins < cutOffMins) return null;

        return {
          RestroCode: v.RestroCode,
          RestroName: v.RestroName,
          // Rating Fix: UI expects 'rating' or 'RestroRating'
          RestroRating: v.RestroRating || "4.2", 
          rating: v.RestroRating || "4.2", 
          OpenTime: v.open_time || v.OpenTime,
          ClosedTime: v.closed_time || v.ClosedTime,
          MinimumOrdermValue: v.MinimumOrderValue || v.MinimumOrdermValue || 0,
          RestroDisplayPhoto: v.RestroDisplayPhoto,
          IsPureVeg: isTrue(v.IsPureVeg) ? 1 : 0,
        };
      }).filter(Boolean);

      if (validVendors.length === 0) return null;

      const aSec = timeToSeconds(s.Arrives), dSec = timeToSeconds(s.Departs);
      const halt = (aSec > 0 && dSec > 0) ? secondsToHuman(dSec - aSec) : (s.Stoptime || "0m");

      return {
        StationCode: code,
        StationName: s.StationName,
        arrival_time: s.Arrives,
        arrival_date: sDate.toISOString().split('T')[0],
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
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
