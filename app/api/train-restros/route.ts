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

function formatTime(val: any) {
  if (!val) return "00:00";
  const str = String(val);
  return str.length >= 5 ? str.slice(0, 5) : str;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trainParam = searchParams.get("train")?.trim() || "";
  const startDateParam = searchParams.get("date")?.trim() || ""; // Ye Boarding Date hai
  const boarding = searchParams.get("boarding")?.trim() || "";

  try {
    const now = new Date();
    const istNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    /* ================= TRAIN ROUTE ================= */

    const { data: stopsRows } = await serviceClient
      .from("TrainRoute")
      .select("*")
      .or(
        `trainNumber.eq.${trainParam},trainNumber.eq.${
          parseInt(trainParam) || 0
        }`
      )
      .order("StnNumber", { ascending: true });

    if (!stopsRows?.length) {
      return NextResponse.json({ ok: true, stations: [] });
    }

    const normBoard = normalize(boarding);
    
    // ✅ STEP 1: Find Boarding Station Day (Base Day)
    // Boarding station ka record nikaal rahe hain taaki uska "Day" pata chale
    const boardingStation = stopsRows.find(
      (s) => normalize(s.StationCode) === normBoard
    );
    
    // Agar boarding station nahi mila (jo ki nahi hona chahiye), toh default pehla station
    const baseDay = boardingStation ? Number(boardingStation.Day || 1) : Number(stopsRows[0].Day || 1);

    const bIdx = stopsRows.findIndex(
      (s) => normalize(s.StationCode) === normBoard
    );

    const activeRoute = bIdx !== -1 ? stopsRows.slice(bIdx) : stopsRows;

    const stationCodes = Array.from(
      new Set(activeRoute.map((s) => normalize(s.StationCode)))
    );

    /* ================= FETCH DATA ================= */

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

    /* ================= STATE MAP ================= */

    const stateMap: Record<string, string> = {};
    stationsData.data?.forEach((st) => {
      stateMap[normalize(st.StationCode)] = st.State || "";
    });

    /* ================= GROUP RESTAURANTS ================= */

    const groupedRestros: Record<string, any[]> = {};

    restrosData.data?.forEach((r) => {
      if (isTrue(r.RaileatsStatus ?? r.IsActive)) {
        const sc = normalize(r.StationCode);
        if (!groupedRestros[sc]) groupedRestros[sc] = [];
        groupedRestros[sc].push(r);
      }
    });

    /* ================= FINAL BUILD ================= */

    const finalStations = activeRoute
      .map((s) => {
        const code = normalize(s.StationCode);
        const vendorsRaw = groupedRestros[code] || [];

        if (!vendorsRaw.length) return null;

        /* ===== ✅ DYNAMIC DATE CALCULATION ===== */

        // 1. User ki select ki hui boarding date
        const arrivalDate = new Date(startDateParam + "T00:00:00");
        
        // 2. Calculation: Current Station Day - Boarding Station Day (Base Day)
        // Example: Boarding Day 2 (User selected 10th Oct). Next Stn Day 3. 
        // 3 - 2 = 1. To arrival date hogi 10th + 1 = 11th Oct.
        const currentStnDay = Number(s.Day || 1);
        const dayDifference = currentStnDay - baseDay;
        
        arrivalDate.setDate(arrivalDate.getDate() + dayDifference);

        // 3. IST check ke liye Time set karna
        const arrivalDateTime = new Date(arrivalDate);
        const [h, m] = (s.Arrives || "00:00").split(":").map(Number);
        arrivalDateTime.setHours(h, m, 0);

        // Past remove logic
        if (arrivalDateTime <= istNow) return null;

        /* ===== VENDORS ===== */

        const validVendors = vendorsRaw
          .map((v) => {
            const openRaw = v.open_time ?? v.OpenTime ?? null;
            const closeRaw = v.closed_time ?? v.ClosedTime ?? null;

            return {
              RestroCode: v.RestroCode,
              RestroName: v.RestroName,
              RestroRating: v.RestroRating || "4.2",
              OpenTime: formatTime(openRaw),
              ClosedTime: formatTime(closeRaw),
              MinimumOrderValue: v.MinimumOrderValue || v.MinimumOrdermValue || 0,
              RestroDisplayPhoto: v.RestroDisplayPhoto,
              IsPureVeg: isTrue(v.IsPureVeg) ? 1 : 0,
            };
          })
          .filter(Boolean);

        return {
          StationCode: code,
          StationName: s.StationName,
          State: stateMap[code] || "",
          Arrives: s.Arrives,
          Departs: s.Departs,
          HaltTime: s.StopTime || s.Stoptime || s.HaltTime || "0m",
          
          // ✅ NAYE FIELDS FOR FRONTEND
          display_date: arrivalDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }), // Result: "12 Oct 2026"
          day_count: currentStnDay, // Result: 1, 2, or 3
          vendors: validVendors,
        };
      })
      .filter(Boolean);

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
