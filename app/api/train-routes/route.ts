// app/api/train-routes/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

type TrainRouteRow = {
  trainId: number;
  trainNumber: number | null;
  trainName: string | null;
  stationFrom: string | null;
  stationTo: string | null;
  runningDays: string | null;
  StnNumber: number | null;
  StationCode: string | null;
  StationName: string | null;
  Arrives: string | null;
  Departs: string | null;
  Stoptime: string | null;
  Distance: string | null;
  Platform: string | null;
  Route: number | null;
  Day: number | null;
};

function todayYMD() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// runningDays text ko "DAILY" / "MON,TUE" style se check
function matchesRunningDay(runningDays: string | null, dateStr: string) {
  if (!runningDays) return true;

  const dayIndex = new Date(dateStr).getDay(); // 0=Sun..6=Sat
  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const code = map[dayIndex];

  const s = runningDays.toUpperCase().trim();
  if (s === "DAILY" || s === "ALL") return true;

  return s.split(/[ ,/]+/).includes(code);
}

// "08:45" → minutes since midnight (525)
function hhmmToMinutes(t?: string | null): number | null {
  if (!t) return null;
  const parts = String(t).slice(0, 5).split(":");
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

// check if arrival window ke andar hai (handle overnight windows bhi)
function isWithinWindow(
  arrivalMin: number,
  openMin: number,
  closeMin: number,
): boolean {
  // normal: open <= close   (eg 10:00-23:30)
  if (closeMin >= openMin) {
    return arrivalMin >= openMin && arrivalMin <= closeMin;
  }
  // overnight: open > close (eg 20:00-06:00)
  // do 2 segments: [open, 1440) OR [0, close]
  return arrivalMin >= openMin || arrivalMin <= closeMin;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const trainParam = (url.searchParams.get("train") || "").trim();
    const stationParam = (url.searchParams.get("station") || "").trim();
    const restroParam = (url.searchParams.get("restro") || "").trim();
    const dateParam =
      (url.searchParams.get("date") || "").trim() || todayYMD();

    if (!trainParam || !stationParam) {
      return NextResponse.json(
        { ok: false, error: "missing_params" },
        { status: 400 },
      );
    }

    const stationCode = stationParam.toUpperCase();
    const supa = serviceClient;

    // ---- 1) Train route fetch (pure train ke saare stations) ----
    const trainNumAsNumber = Number(trainParam);
    const trainFilterValue = Number.isFinite(trainNumAsNumber)
      ? trainNumAsNumber
      : trainParam;

    const { data, error } = await supa
      .from("TrainRoute")
      .select(
        "trainId, trainNumber, trainName, stationFrom, stationTo, runningDays, StnNumber, StationCode, StationName, Arrives, Departs, Stoptime, Distance, Platform, Route, Day",
      )
      .eq("trainNumber", trainFilterValue)
      .order("Day", { ascending: true });

    if (error) {
      console.error("train-routes GET supabase error", error);
      return NextResponse.json(
        { ok: false, error: "db_error" },
        { status: 500 },
      );
    }

    const allRows = (data || []) as TrainRouteRow[];
    if (!allRows.length) {
      return NextResponse.json(
        { ok: false, error: "train_not_found" },
        { status: 404 },
      );
    }

    // ---- 2) Station match ----
    const rowsForStation = allRows.filter(
      (r) =>
        (r.StationCode || "").toUpperCase() === stationCode.toUpperCase(),
    );

    if (!rowsForStation.length) {
      return NextResponse.json(
        { ok: false, error: "station_not_on_route" },
        { status: 400 },
      );
    }

    // ---- 3) Running day filter ----
    const rowsForDate = rowsForStation.filter((r) =>
      matchesRunningDay(r.runningDays, dateParam),
    );

    if (!rowsForDate.length) {
      return NextResponse.json(
        { ok: false, error: "not_running_on_date" },
        { status: 400 },
      );
    }

    const first = rowsForDate[0];
    const arrivalText = first.Arrives || first.Departs || "";
    const arrivalMinutes = hhmmToMinutes(arrivalText);

    // ---- 4) Optional: Restro open/close validation ----
    if (restroParam && arrivalMinutes != null) {
      const restroCodeNum = Number(restroParam);
      if (Number.isFinite(restroCodeNum)) {
        const { data: restroRows, error: restroErr } = await supa
          .from("RestroMaster")
          .select("RestroCode, StationCode, OpenTime, ClosedTime")
          .eq("RestroCode", restroCodeNum)
          .limit(1);

        if (restroErr) {
          console.error("train-routes restro fetch error", restroErr);
        } else if (restroRows && restroRows.length > 0) {
          const restro = restroRows[0] as any;
          const openStr: string | null =
            (restro.OpenTime as string | null) ?? null;
          const closeStr: string | null =
            (restro.ClosedTime as string | null) ?? null;

          const openMin =
            openStr != null ? hhmmToMinutes(openStr) : null;
          const closeMin =
            closeStr != null ? hhmmToMinutes(closeStr) : null;

          if (
            openMin != null &&
            closeMin != null &&
            !isWithinWindow(arrivalMinutes, openMin, closeMin)
          ) {
            // yahan se error bhejna hai: restro time mismatch
            return NextResponse.json(
              {
                ok: false,
                error: "restro_time_mismatch",
                meta: {
                  arrival: arrivalText.slice(0, 5),
                  restroOpen: openStr,
                  restroClose: closeStr,
                  stationCode,
                  train: trainParam,
                },
              },
              { status: 400 },
            );
          }
        }
      }
    }

    // ---- 5) Success response ----
    return NextResponse.json({
      ok: true,
      rows: rowsForDate,
      meta: {
        stationCode,
        stationName: first.StationName,
        train: trainParam,
        date: dateParam,
        count: rowsForDate.length,
        arrival: arrivalText.slice(0, 5),
      },
    });
  } catch (e) {
    console.error("train-routes GET server_error", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }
}
