export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import pMap from "p-map";

// helpers (assume already present in your file)
const normalizeCode = (v: any) => String(v || "").trim().toUpperCase();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const trainParam = searchParams.get("train");
    const selectedDateStr = searchParams.get("date");

    if (!trainParam || !selectedDateStr) {
      return NextResponse.json({ ok: false, error: "missing_params" });
    }

    const selectedDate = new Date(selectedDateStr);

    // ✅ IST current time
    const istNow = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    // 👉 FETCH YOUR DATA (assume already working)
    const stopsRows: any[] = globalThis.__stopsRows || [];
    const restroRows: any[] = globalThis.__restroRows || [];

    // group restros by station
    const grouped: Record<string, any[]> = {};
    for (const r of restroRows || []) {
      const sc = normalizeCode(r.StationCode);
      if (!grouped[sc]) grouped[sc] = [];
      grouped[sc].push(r);
    }

    const finalStations: any[] = [];

    const stationResults = await pMap(
      stopsRows,
      async (s: any) => {
        const sc = normalizeCode(
          s.StationCode || s.stationcode || s.station
        );

        const stationName = s.StationName || s.stationname || "";

        const arrival_time = s.ArrivalTime || s.arrival_time;
        const halt_time = s.HaltTime || s.halt_time;

        const day = Number(s.Day || 1);

        // 👉 arrival date calculation
        const arrivalDateTime = new Date(selectedDate);
        arrivalDateTime.setDate(arrivalDateTime.getDate() + (day - 1));

        if (arrival_time) {
          const [h, m] = arrival_time.split(":");
          arrivalDateTime.setHours(Number(h), Number(m), 0);
        }

        // ✅ FIXED LOGIC (MAIN BUG)
        const stationDateOnly = new Date(arrivalDateTime.toDateString());
        const todayOnly = new Date(istNow.toDateString());

        const isTodayStation =
          stationDateOnly.getTime() === todayOnly.getTime();

        // ❌ hide only if already passed
        if (isTodayStation && arrivalDateTime <= istNow) {
          return null;
        }

        const restros = grouped[sc] || [];

        const vendors = (restros || [])
          .map((cv: any) => {
            const openTime = cv.open_time;
            const closeTime = cv.closed_time;

            // cutoff logic
            const cutOff = Number(cv.CutOffTime || 0);

            const diffMin =
              (arrivalDateTime.getTime() - istNow.getTime()) / 60000;

            if (isTodayStation && diffMin < cutOff) {
              return null;
            }

            return {
              RestroCode: cv.RestroCode,
              RestroName: cv.RestroName,
              isActive: true,
              OpenTime: openTime,
              ClosedTime: closeTime,
              MinimumOrdermValue: cv.MinimumOrdermValue,
              RestroDisplayPhoto: cv.RestroDisplayPhoto,
              IsPureVeg: cv.IsPureVeg ?? 0,
              source: "restromaster",
              raw: cv,
            };
          })
          .filter(Boolean);

        if (!vendors.length) return null;

        return {
          StationCode: sc,
          StationName: stationName,
          arrival_time,
          halt_time,
          Day: day,
          arrival_date: arrivalDateTime,
          vendors,
        };
      },
      { concurrency: 10 }
    );

    for (const r of stationResults) {
      if (r) finalStations.push(r);
    }

    const trainName =
      stopsRows[0]?.trainName || stopsRows[0]?.train_name || null;

    return NextResponse.json({
      ok: true,
      train: {
        trainNumber: trainParam,
        trainName,
      },
      stations: finalStations,
    });
  } catch (e) {
    console.error("train-restros error", e);

    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
