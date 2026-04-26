import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/* ================= HELPERS ================= */

function formatHaltTime(val: any) {
  if (!val) return "0m";
  const parts = String(val).split(":").map(Number);
  const hh = parts[0] || 0;
  const mm = parts[1] || 0;
  return `${hh * 60 + mm}m`;
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
  return String(val).slice(0, 5);
}

/* ================= API ================= */

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

    /* ================= FETCH ROUTE ================= */

    const { data: stopsRows } = await serviceClient
      .from("TrainRoute")
      .select("*")
      .or(`trainNumber.eq.${trainParam},trainNumber.eq.${parseInt(trainParam) || 0}`)
      .order("StnNumber", { ascending: true });

    if (!stopsRows?.length) {
      return NextResponse.json({ ok: true, stations: [] });
    }

    /* ================= BOARDING ================= */

    const normBoard = normalize(boarding);
    const boardingStation = stopsRows.find(
      (s) => normalize(s.StationCode) === normBoard
    );

    const baseDay = boardingStation
      ? Number(boardingStation.Day || 1)
      : Number(stopsRows[0].Day || 1);

    const bIdx = stopsRows.findIndex(
      (s) => normalize(s.StationCode) === normBoard
    );

    const activeRoute = bIdx !== -1 ? stopsRows.slice(bIdx) : stopsRows;

    const stationCodes = Array.from(
      new Set(activeRoute.map((s) => normalize(s.StationCode)))
    );

    /* ================= FETCH STATIONS + RESTROS ================= */

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

    /* ================= FINAL BUILD ================= */

    const finalStations = activeRoute
      .map((s) => {
        const code = normalize(s.StationCode);
        const vendorsRaw = groupedRestros[code] || [];

        if (!vendorsRaw.length) return null;

        /* ===== DATE CALC ===== */

        const sDate = new Date(startDateParam + "T00:00:00");
        const currentDay = Number(s.Day || 1);
        const dayDiff = currentDay - baseDay;
        sDate.setDate(sDate.getDate() + dayDiff);

        const arrival = formatTime(s.Arrives || "00:00");

        const arrivalDateTime = new Date(sDate);
        const [h, m] = arrival.split(":").map(Number);
        arrivalDateTime.setHours(h, m, 0);

        // ❌ past stations हटाओ (ये रखना है)
        if (arrivalDateTime <= istNow) return null;

        /* ================= FINAL VENDORS (NO TIME FILTER) ================= */

        const validVendors = vendorsRaw
          .map((v: any) => {
            const open = formatTime(v.open_time ?? v.OpenTime);
            const close = formatTime(v.closed_time ?? v.ClosedTime);

            return {
              RestroCode: v.RestroCode,
              RestroName: v.RestroName,
              RestroRating: v.RestroRating || "4.2",
              OpenTime: open,
              ClosedTime: close,
              MinimumOrderValue:
                v.MinimumOrderValue || v.MinimumOrdermValue || 0,
              RestroDisplayPhoto: v.RestroDisplayPhoto,
              IsPureVeg: isTrue(v.IsPureVeg) ? 1 : 0,
              CutOffTime: v.CutOffTime || 0, // 🔥 IMPORTANT
            };
          })
          .filter(Boolean);

        if (!validVendors.length) return null;

        return {
          StationCode: code,
          StationName: s.StationName,
          State: stateMap[code] || "",
          Arrives: arrival,
          Departs: s.Departs,
          HaltTime: formatHaltTime(s.Stoptime || s.StopTime),
          date: sDate.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
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