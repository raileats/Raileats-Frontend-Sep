import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

// Helper: Normalize strings
function normalize(val: any) {
  return String(val ?? "").toUpperCase().trim();
}

// Helper: Boolean check
function isTrue(val: any) {
  if (val === undefined || val === null) return true;
  const s = String(val).toLowerCase();
  return ["true", "1", "active", "yes"].includes(s);
}

// Helper: Time to seconds
function timeToSeconds(t: string | null | undefined) {
  if (!t) return 0;
  const parts = String(t).trim().split(":").map(Number);
  return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
}

// Helper: IST Current Time (Fixed)
function getISTNow() {
  const now = new Date();
  // Server chahe kahin bhi ho, India ka current time nikalna
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trainParam = searchParams.get("train")?.trim() || "";
  const startDateStr = searchParams.get("date")?.trim() || ""; // Format: 2026-03-20
  const boarding = searchParams.get("boarding")?.trim() || "";

  if (!trainParam || !startDateStr || !boarding) {
    return NextResponse.json({ ok: false, error: "Params missing" }, { status: 400 });
  }

  try {
    // 1. Fetch Train Route
    const { data: stopsRows } = await serviceClient
      .from("TrainRoute")
      .select("*")
      .or(`trainNumber.eq.${trainParam},trainNumber.eq.${parseInt(trainParam) || 0}`)
      .order("StnNumber", { ascending: true });

    if (!stopsRows?.length) return NextResponse.json({ ok: true, stations: [] });

    const istNow = getISTNow();
    const baseDay = Number(stopsRows[0].Day || 1);

    // 2. Station Codes & Slicing
    const normBoard = normalize(boarding);
    const bIdx = stopsRows.findIndex(s => normalize(s.StationCode) === normBoard);
    const activeRoute = bIdx !== -1 ? stopsRows.slice(bIdx) : stopsRows;
    const stationCodes = Array.from(new Set(activeRoute.map(s => normalize(s.StationCode))));

    // 3. Fetch Restros (Exact CSV Columns)
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

    // 4. Processing with Strict Past-Date & Cutoff Filter
    const finalStations = activeRoute.map(s => {
      const code = normalize(s.StationCode);
      const vendorsRaw = grouped[code] || [];
      if (vendorsRaw.length === 0) return null;

      // Actual station date calculate karna (Boarding Date + Days)
      const sDate = new Date(startDateStr); 
      sDate.setDate(sDate.getDate() + (Number(s.Day || 1) - baseDay));
      const arrivalDateStr = sDate.toISOString().split('T')[0];
      
      // Exact Arrival Time object in IST
      const arrivalDateTime = new Date(`${arrivalDateStr}T${s.Arrives || "00:00:00"}`);

      // --- STRICT FILTER: Agar station ka waqt nikal gaya hai ---
      // Agar station arrival time (20 March) IST Now (31 March) se purana hai toh skip
      if (arrivalDateTime.getTime() < istNow.getTime()) {
        return null; 
      }

      const validVendors = vendorsRaw.map(v => {
        const cutOffMins = Number(v.CutOffTime || 0);
        const diffMins = (arrivalDateTime.getTime() - istNow.getTime()) / (1000 * 60);

        // --- CUTOFF FILTER ---
        if (diffMins < cutOffMins) return null;

        return {
          RestroCode: v.RestroCode,
          RestroName: v.RestroName,
          // UI Fix: Rating ko "rating" key mein bhejna (jo aapka frontend dhund raha hai)
          rating: v.RestroRating || "4.2",
          RestroRating: v.RestroRating || "4.2",
          OpenTime: v.open_time || v.OpenTime,
          ClosedTime: v.closed_time || v.ClosedTime,
          MinimumOrdermValue: v.MinimumOrderValue || 0,
          RestroDisplayPhoto: v.RestroDisplayPhoto,
          IsPureVeg: isTrue(v.IsPureVeg) ? 1 : 0,
        };
      }).filter(Boolean);

      if (validVendors.length === 0) return null;

      return {
        StationCode: code,
        StationName: s.StationName,
        arrival_time: s.Arrives,
        arrival_date: arrivalDateStr,
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
