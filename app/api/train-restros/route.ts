import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

function normalize(val: any) {
  return String(val ?? "").toUpperCase().trim();
}

function isTrue(val: any) {
  if (val === undefined || val === null) return true;
  const s = String(val).toLowerCase();
  return ["true", "1", "active", "yes"].includes(s);
}

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trainParam = searchParams.get("train")?.trim() || "";
  const startDateParam = searchParams.get("date")?.trim() || "";
  const boarding = searchParams.get("boarding")?.trim() || "";

  if (!trainParam || !startDateParam || !boarding) {
    return NextResponse.json({ ok: false, error: "Params missing" }, { status: 400 });
  }

  try {
    const now = new Date();
    const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

    // 1. Fetch Train Route
    const { data: stopsRows } = await serviceClient
      .from("TrainRoute")
      .select("*")
      .or(`trainNumber.eq.${trainParam},trainNumber.eq.${parseInt(trainParam) || 0}`)
      .order("StnNumber", { ascending: true });

    if (!stopsRows?.length) return NextResponse.json({ ok: true, stations: [] });

    const normBoard = normalize(boarding);
    const bIdx = stopsRows.findIndex(s => normalize(s.StationCode) === normBoard);
    const baseDay = Number(stopsRows[0].Day || 1);
    const activeRoute = bIdx !== -1 ? stopsRows.slice(bIdx) : stopsRows;
    const stationCodes = Array.from(new Set(activeRoute.map(s => normalize(s.StationCode))));

    // 2. Fetch State & Restros
    const [stationsData, restrosData] = await Promise.all([
      serviceClient.from("Stations").select("StationCode, State").in("StationCode", stationCodes),
      serviceClient.from("RestroMaster").select("*").in("StationCode", stationCodes)
    ]);

    const stateMap: Record<string, string> = {};
    stationsData.data?.forEach(st => {
      stateMap[normalize(st.StationCode)] = st.State || "";
    });

    const groupedRestros: Record<string, any[]> = {};
    restrosData.data?.forEach(r => {
      if (isTrue(r.RaileatsStatus ?? r.IsActive)) {
        const sc = normalize(r.StationCode);
        if (!groupedRestros[sc]) groupedRestros[sc] = [];
        groupedRestros[sc].push(r);
      }
    });

    // 3. Process Stations
    const finalStations = activeRoute.map(s => {
      const code = normalize(s.StationCode);
      const vendorsRaw = groupedRestros[code] || [];
      if (vendorsRaw.length === 0) return null;

      const sDate = new Date(startDateParam + "T00:00:00");
      sDate.setDate(sDate.getDate() + (Number(s.Day || 1) - baseDay));
      const arrivalDateTime = new Date(sDate);
      const [h, m, sec] = (s.Arrives || "00:00:00").split(":").map(Number);
      arrivalDateTime.setHours(h, m, sec || 0);

      if (arrivalDateTime <= istNow) return null;

      const validVendors = vendorsRaw.map(v => {
        const cutOff = Number(v.CutOffTime || 0);
        const diffMin = (arrivalDateTime.getTime() - istNow.getTime()) / 60000;
        if (diffMin < cutOff) return null;

        return {
          RestroCode: v.RestroCode,
          RestroName: v.RestroName,
          RestroRating: v.RestroRating || "4.2",
          // ✅ FIXED: Using exact database columns from your CSV
          open_time: v.open_time || v.OpenTime || "N/A",
          closed_time: v.closed_time || v.ClosedTime || "N/A",
          MinimumOrderValue: v.MinimumOrderValue || 0,
          RestroDisplayPhoto: v.RestroDisplayPhoto,
          IsPureVeg: isTrue(v.IsPureVeg) ? 1 : 0
        };
      }).filter(Boolean);

      if (validVendors.length === 0) return null;

      const aSec = timeToSeconds(s.Arrives);
      const dSec = timeToSeconds(s.Departs);
      const halt = (aSec > 0 && dSec > 0) ? secondsToHuman(dSec - aSec) : (s.Stoptime || "0m");

      return {
        StationCode: code,
        StationName: s.StationName,
        State: stateMap[code] || "",
        Arrives: s.Arrives,
        Departs: s.Departs,
        arrival_date: sDate.toISOString().split("T")[0],
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
