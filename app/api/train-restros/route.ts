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
  const startDateParam = searchParams.get("date")?.trim() || ""; // Format: YYYY-MM-DD
  const boarding = searchParams.get("boarding")?.trim() || "";

  try {
    const now = new Date();
    const istNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    /* 1. Fetch Train Route Data */
    const { data: stopsRows } = await serviceClient
      .from("TrainRoute")
      .select("*")
      .or(`trainNumber.eq.${trainParam},trainNumber.eq.${parseInt(trainParam) || 0}`)
      .order("StnNumber", { ascending: true });

    if (!stopsRows?.length) {
      return NextResponse.json({ ok: true, stations: [] });
    }

    /* 2. Boarding Station & Base Day Calculation */
    const normBoard = normalize(boarding);
    const boardingStation = stopsRows.find((s) => normalize(s.StationCode) === normBoard);
    
    // Agar boarding station nahi milta toh pehle stop ko base maante hain
    const baseDay = boardingStation ? Number(boardingStation.Day || 1) : Number(stopsRows[0].Day || 1);
    
    // Sirf boarding station ke baad wale stops dikhane ke liye
    const bIdx = stopsRows.findIndex((s) => normalize(s.StationCode) === normBoard);
    const activeRoute = bIdx !== -1 ? stopsRows.slice(bIdx) : stopsRows;

    const stationCodes = Array.from(
      new Set(activeRoute.map((s) => normalize(s.StationCode)))
    );

    /* 3. Parallel Fetch: Station Details & Restaurant Details */
    const [stationsData, restrosData] = await Promise.all([
      serviceClient
        .from("Stations")
        .select("StationCode, State")
        .in("StationCode", stationCodes),

      serviceClient
        .from("RestroMaster")
        .select("*")
        .in("StationCode", stationCodes),
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

    /* 4. FINAL BUILD: Stations with Calculated Dates & Restaurants */
    const finalStations = activeRoute
      .map((s) => {
        const code = normalize(s.StationCode);
        const vendorsRaw = groupedRestros[code] || [];

        if (!vendorsRaw.length) return null;

        /* ===== DEEP DATE CALCULATION ===== */
        // User ki selected date (startDateParam) par utne din add karo jitna boarding se difference hai
        const sDate = new Date(startDateParam + "T00:00:00");
        const currentStnDay = Number(s.Day || 1);
        const dayDiff = currentStnDay - baseDay;
        
        sDate.setDate(sDate.getDate() + dayDiff);

        const arrivalDateTime = new Date(sDate);
        const [h, m] = (s.Arrives || "00:00").split(":").map(Number);
        arrivalDateTime.setHours(h, m, 0);

        // Jo stations nikal chuke hain unhe filter out karein
        if (arrivalDateTime <= istNow) return null;

       /* ===== VENDORS MAPPING ===== */
        const validVendors = vendorsRaw.map((v: any) => ({
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
          HaltTime: formatHaltTime(s.Stoptime || s.StopTime),
          // Frontend ko isi 'date' key ki zaroorat hai
          date: sDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          day_count: currentStnDay,
          vendors: validVendors,
        };
      })
      .filter(Boolean); // <--- Sirf ek baar hona chahiye

    // Final response bhi sirf EK baar hona chahiye
    return NextResponse.json({
      ok: true,
      stations: finalStations,
    });

  } catch (err: any) {
    console.error("train-restros error", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
