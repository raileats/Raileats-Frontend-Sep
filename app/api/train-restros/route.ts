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
  const startDateParam = searchParams.get("date")?.trim() || "";
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
    const bIdx = stopsRows.findIndex(
      (s) => normalize(s.StationCode) === normBoard
    );

    const baseDay = Number(stopsRows[0].Day || 1);
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

        /* ===== DATE CALCULATION ===== */

        const sDate = new Date(startDateParam + "T00:00:00");
        sDate.setDate(
          sDate.getDate() + (Number(s.Day || 1) - baseDay)
        );

        const arrivalDateTime = new Date(sDate);

        const [h, m] = (s.Arrives || "00:00")
          .split(":")
          .map(Number);

        arrivalDateTime.setHours(h, m, 0);

        // ❌ past remove
        if (arrivalDateTime <= istNow) return null;

        /* ===== VENDORS ===== */

        const validVendors = vendorsRaw
          .map((v) => {
            const openRaw =
              v.open_time ?? v.OpenTime ?? null;

            const closeRaw =
              v.closed_time ?? v.ClosedTime ?? null;

            return {
              RestroCode: v.RestroCode,
              RestroName: v.RestroName,
              RestroRating: v.RestroRating || "4.2",

              // ✅ FINAL FIX (IMPORTANT)
              OpenTime: formatTime(openRaw),
              ClosedTime: formatTime(closeRaw),

              MinimumOrderValue:
                v.MinimumOrderValue ||
                v.MinimumOrdermValue ||
                0,

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

          HaltTime: s.StopTime || s.HaltTime || "0m", // ✅ added

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
