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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trainParam = searchParams.get("train")?.trim() || "";
  const startDateParam = searchParams.get("date")?.trim() || "";
  const boarding = searchParams.get("boarding")?.trim() || "";

  try {
    const now = new Date();
    const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

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

    const finalStations = activeRoute.map(s => {
      const code = normalize(s.StationCode);
      const vendorsRaw = groupedRestros[code] || [];
      if (vendorsRaw.length === 0) return null;

      const sDate = new Date(startDateParam + "T00:00:00");
      sDate.setDate(sDate.getDate() + (Number(s.Day || 1) - baseDay));
      const arrivalDateTime = new Date(sDate);
      const [h, m] = (s.Arrives || "00:00").split(":").map(Number);
      arrivalDateTime.setHours(h, m, 0);

      if (arrivalDateTime <= istNow) return null;

      const validVendors = vendorsRaw.map(v => {
        // ✅ DEBUG: Check open_time in your console/terminal
        console.log(`Restro: ${v.RestroName}, Open: ${v.open_time}, Closed: ${v.closed_time}`);

        return {
          RestroCode: v.RestroCode,
          RestroName: v.RestroName,
          RestroRating: v.RestroRating || "4.2",
          // ✅ Strict Mapping from CSV columns
          open_time: v.open_time || v.OpenTime || "NA", 
          closed_time: v.closed_time || v.ClosedTime || "NA",
          MinimumOrderValue: v.MinimumOrderValue || 0,
          RestroDisplayPhoto: v.RestroDisplayPhoto,
          IsPureVeg: isTrue(v.IsPureVeg) ? 1 : 0
        };
      }).filter(v => v !== null);

      return {
        StationCode: code,
        StationName: s.StationName,
        State: stateMap[code] || "",
        Arrives: s.Arrives,
        Departs: s.Departs,
        vendors: validVendors
      };
    }).filter(Boolean);

    return NextResponse.json({ ok: true, stations: finalStations });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
