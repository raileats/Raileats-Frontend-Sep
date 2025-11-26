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

// runningDays text ko filhaal sirf "DAILY" / "MON,TUE" type basic check se handle kar rahe hain
function matchesRunningDay(runningDays: string | null, dateStr: string) {
  if (!runningDays) return true; // agar data nahi hai to allow kar do

  const dayIndex = new Date(dateStr).getDay(); // 0=Sun..6=Sat
  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const code = map[dayIndex];

  const s = runningDays.toUpperCase().trim();
  if (s === "DAILY" || s === "ALL") return true;

  return s.split(/[ ,/]+/).includes(code); // e.g. "MON,TUE,WED"
}

function toMinutes(hhmm: string | null | undefined): number {
  if (!hhmm) return -1;
  const [hh, mm] = String(hhmm).trim().split(":");
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
  return h * 60 + m;
}

function fmtHHMM(hhmm: string | null | undefined) {
  if (!hhmm) return "";
  const [hh = "00", mm = "00"] = String(hhmm).split(":");
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const trainParam = (url.searchParams.get("train") || "").trim();
    const stationParam = (url.searchParams.get("station") || "").trim();
    const dateParam =
      (url.searchParams.get("date") || "").trim() || todayYMD();
    const restroParam = (url.searchParams.get("restro") || "").trim();

    if (!trainParam || !stationParam) {
      return NextResponse.json(
        { ok: false, error: "missing_params" },
        { status: 400 },
      );
    }

    const stationCode = stationParam.toUpperCase();
    const supa = serviceClient;

    // column ka naam "trainNumber" hai
    const trainNumAsNumber = Number(trainParam);
    const trainFilterValue = Number.isFinite(trainNumAsNumber)
      ? trainNumAsNumber
      : trainParam;

    // 1) Poore train ka route laao (sab stations)
    const { data, error } = await supa
      .from("TrainRoute")
      .select(
        "trainId, trainNumber, trainName, stationFrom, stationTo, runningDays, StnNumber, StationCode, StationName, Arrives, Departs, Stoptime, Distance, Platform, Route, Day",
      )
      .eq("trainNumber", trainFilterValue)
      .order("StnNumber", { ascending: true });

    if (error) {
      console.error("train-routes GET supabase error", error);
      return NextResponse.json(
        { ok: false, error: "db_error" },
        { status: 500 },
      );
    }

    const allRows: TrainRouteRow[] = (data || []) as any[];

    // ---- Train hi nahi mila ----
    if (!allRows.length) {
      return NextResponse.json(
        { ok: false, error: "train_not_found" },
        { status: 404 },
      );
    }

    // ---- Running-day filter ----
    const dayRows = allRows.filter((r) =>
      matchesRunningDay(r.runningDays, dateParam),
    );
    if (!dayRows.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "not_running_on_date",
          meta: { train: trainParam, date: dateParam },
        },
        { status: 400 },
      );
    }

    // ---- Station check (kya iss route me hai?) ----
    const stationRows = dayRows.filter(
      (r) => (r.StationCode || "").toUpperCase() === stationCode,
    );

    if (!stationRows.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "station_not_on_route",
          meta: {
            train: trainParam,
            stationCode,
          },
        },
        { status: 400 },
      );
    }

    // yahi rows UI ko bhejenge
    const rows = stationRows;

    // arrival time (Arrives → HH:MM)
    const first = rows[0];
    const rawArr =
      (first.Arrives || first.Departs || "").slice(0, 5) || null;
    const arrivalMinutes = toMinutes(rawArr);
    const arrivalHHMM = fmtHHMM(rawArr);

    // ---- Restro open/close check (agar restro param diya hai) ----
    if (restroParam) {
      const restroCodeNum = Number(restroParam);
      const restroFilter = Number.isFinite(restroCodeNum)
        ? restroCodeNum
        : restroParam;

      const { data: restroRows, error: restroErr } = await supa
        .from("RestroMaster")
        .select(
          'RestroCode, StationCode, StationName, "0penTime", "ClosedTime"',
        )
        .eq("RestroCode", restroFilter)
        .eq("StationCode", stationCode)
        .limit(1);

      if (restroErr) {
        console.error("restro meta fetch error", restroErr);
      }

      if (restroRows && restroRows.length) {
        const r = restroRows[0] as any;

        // Column actually named "0penTime" with zero
        const openRaw: string | null =
          (r["0penTime"] as string | null) ?? null;
        const closeRaw: string | null =
          (r["ClosedTime"] as string | null) ?? null;

        const openMins = toMinutes(openRaw);
        const closeMins = toMinutes(closeRaw);

        // arrival / open / close sab valid ho to hi compare
        if (
          arrivalMinutes >= 0 &&
          openMins >= 0 &&
          closeMins >= 0 &&
          (arrivalMinutes < openMins || arrivalMinutes > closeMins)
        ) {
          return NextResponse.json(
            {
              ok: false,
              error: "restro_time_mismatch",
              meta: {
                restroCode: r.RestroCode,
                arrival: arrivalHHMM,
                restroOpen: fmtHHMM(openRaw),
                restroClose: fmtHHMM(closeRaw),
                stationCode,
              },
            },
            { status: 400 },
          );
        }
      }
    }

    // ---- Success response ----
    return NextResponse.json({
      ok: true,
      rows,
      meta: {
        stationCode,
        stationName: first.StationName,
        train: trainParam,
        date: dateParam,
        count: rows.length,
        arrival: arrivalHHMM,
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
