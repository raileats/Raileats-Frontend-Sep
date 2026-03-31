import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/* ================= HELPERS ================= */

function formatHaltTime(val: any) {
  if (!val) return "0m";
  const parts = String(val).split(":").map(Number);
  const hh = parts[0] || 0;
  const mm = parts[1] || 0;
  const totalMin = hh * 60 + mm;
  return `${totalMin}m`;
}

function normalize(val: any) {
  return String(val ?? "").toUpperCase().trim();
}

function isTrue(val: any) {
  if (val === undefined || val === null) return true;
  const s = String(val).toLowerCase();
  return ["true", "1", "active", "yes"].includes(s);
}

function formatTime(val: any) {
  if (!val) return "00:00";
  const str = String(val);
  return str.length >= 5 ? str.slice(0, 5) : str;
}

/* ================= MAIN API HANDLER ================= */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trainParam = searchParams.get("train")?.trim() || "";
  const startDateParam = searchParams.get("date")?.trim() || "";
  const boarding = searchParams.get("boarding")?.trim() || "";

  try {
    const now = new Date();
    const istNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    /* 1. Fetch Train Route */
    const { data: stopsRows } = await serviceClient
      .from("TrainRoute")
      .select("*")
      .or(`trainNumber.eq.${trainParam},trainNumber.eq.${parseInt(trainParam) || 0}`)
      .order("StnNumber", { ascending: true });

    if (!stopsRows?.length) return NextResponse.json({ ok: true, stations: [] });

    /* 2. Logic for Boarding & Base Day */
    const normBoard = normalize(boarding);
    const bIdx = stopsRows.findIndex((s) => normalize(s.StationCode) === normBoard);
    
    // Boarding point se base day nikalna (important for date calculation)
    const boardingStation = bIdx !== -1 ? stopsRows[bIdx] : stopsRows[0];
    const baseDay = Number(boardingStation.Day || 1);
    
    const activeRoute = bIdx !== -1 ? stopsRows.slice(bIdx) : stopsRows;
    const stationCodes = Array.from(new Set(activeRoute.map((s) => normalize(s.StationCode))));

    /* 3. Fetch Station & Restaurant Data */
    const [stationsData, restrosData] = await Promise.all([
      serviceClient.from("Stations").select("StationCode, State").in("StationCode", stationCodes),
      serviceClient.from("RestroMaster").select("*").in("StationCode", stationCodes),
    ]);

    const stateMap: Record<string, string> = {};
    stationsData.data?.forEach((st) => {
      stateMap[normalize(st.StationCode)] = st.State || "";
    });

    const groupedRestros: Record<string, any[]> = {};
    restrosData.data?.forEach((r) => {
      if (isTrue(r.RaileatsStatus ?? r.IsActive)) {
        const sc = normalize(r.StationCode);
        if (!groupedRestros[sc]) groupedRestros[sc] = [];
        groupedRestros[sc].push(r);
      }
    });

    /* 4. Final Build with Date & Day Logic */
    const finalStations = activeRoute
      .map((s) => {
        const code = normalize(s.StationCode);
        const vendorsRaw = groupedRestros[code] || [];
        if (!vendorsRaw.length) return null;

        /* DATE CALCULATION */
        const sDate = new Date(startDateParam + "T00:00:00");
        const currentStnDay = Number(s.Day || 1);
        const dayDifference = currentStnDay - baseDay;
        
        sDate.setDate(sDate.getDate() + dayDifference);

        const arrivalDateTime = new Date(sDate);
        const [h, m] = (s.Arrives || "00:00").split(":").map(Number);
        arrivalDateTime.setHours(h, m, 0);

        // Past remove logic
        if (arrivalDateTime <= istNow) return null;

        const validVendors = vendorsRaw.map((v) => ({
          RestroCode: v.RestroCode,
          RestroName: v.RestroName,
          RestroRating: v.RestroRating || "4.2",
          OpenTime: formatTime(v.open_time ?? v.OpenTime),
          ClosedTime: formatTime(v.closed_time ?? v.ClosedTime),
          MinimumOrderValue: v.MinimumOrderValue || v.MinimumOrdermValue || 0,
          RestroDisplayPhoto: v.RestroDisplayPhoto,
          IsPureVeg: isTrue(v.IsPureVeg) ? 1 : 0,
        }));

        return {
          StationCode: code,
          StationName: s.StationName,
          State: stateMap[code] || "",
          Arrives: s.Arrives,
          Departs: s.Departs,
          HaltTime: formatHaltTime(s.Stoptime),
          // ✅ Naye fields jo Slug Page ko chahiye
          display_date: sDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          day_count: currentStnDay,
          vendors: validVendors,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ ok: true, stations: finalStations });

  } catch (err: any) {
    console.error("train-restros error", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
