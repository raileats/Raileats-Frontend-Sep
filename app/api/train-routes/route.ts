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

// runningDays text ko filhaal sirf "DAILY" / "MON,TUE" type basic check se handle kar rahe hain
function matchesRunningDay(runningDays: string | null, dateStr: string) {
  if (!runningDays) return true; // agar data nahi hai to allow kar do

  const dayIndex = new Date(dateStr).getDay(); // 0=Sun..6=Sat
  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const code = map[dayIndex];

  const s = runningDays.toUpperCase().trim();

  if (s === "DAILY" || s === "ALL") return true;

  // e.g. "MON,TUE,WED" etc
  return s.split(/[ ,/]+/).includes(code);
}

// "08:45:00" / "08:45" -> "08:45"
function toHHMM(v: any): string {
  if (!v) return "";
  const s = String(v).trim();
  if (!s) return "";
  return s.slice(0, 5);
}

// "08:45" -> minutes number, invalid par null
function hhmmToMinutes(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mi)) return null;
  return h * 60 + mi;
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

    // ---- 1) Pehle given station ke rows nikaalo ----
    const { data: atStation, error } = await supa
      .from("TrainRoute")
      .select(
        "trainId, trainNumber, trainName, stationFrom, stationTo, runningDays, StnNumber, StationCode, StationName, Arrives, Departs, Stoptime, Distance, Platform, Route, Day",
      )
      .eq("trainNumber", trainFilterValue)
      .eq("StationCode", stationCode)
      .order("Day", { ascending: true });

    if (error) {
      console.error("train-routes GET supabase error", error);
      return NextResponse.json(
        { ok: false, error: "db_error" },
        { status: 500 },
      );
    }

    let rows: TrainRouteRow[] = (atStation || []) as TrainRouteRow[];

    // ---- 2) Train / station existence check ----
    if (!rows.length) {
      // check: train exists but station nahi?
      const { data: anyStation, error: anyErr } = await supa
        .from("TrainRoute")
        .select("trainId")
        .eq("trainNumber", trainFilterValue)
        .limit(1);

      if (anyErr) {
        console.error("train-routes check-any-station error", anyErr);
        return NextResponse.json(
          { ok: false, error: "db_error" },
          { status: 500 },
        );
      }

      if (!anyStation || anyStation.length === 0) {
        return NextResponse.json(
          { ok: false, error: "train_not_found" },
          { status: 404 },
        );
      }

      // train hai, par yeh station nahi
      return NextResponse.json(
        { ok: false, error: "station_not_on_route" },
        { status: 400 },
      );
    }

    // day filter (runningDays)
    rows = rows.filter((r) => matchesRunningDay(r.runningDays, dateParam));

    if (!rows.length) {
      return NextResponse.json(
        { ok: false, error: "not_running_on_date" },
        { status: 400 },
      );
    }

    // yeh row hum arrival ke liye use kar rahe
    const mainRow = rows[0];
    const arrivalHHMM = toHHMM(mainRow.Arrives || mainRow.Departs);

    // ---- 3) Restro time window check (agar restro param mila ho) ----
    if (restroParam) {
      const restroCodeNum = Number(restroParam);
      if (Number.isFinite(restroCodeNum)) {
        const { data: restroRows, error: restroErr } = await supa
          .from("RestroMaster")
          .select(
            "RestroCode, StationCode, OpenTime, CloseTime, ClosedTime, open_time, close_time",
          )
          .eq("RestroCode", restroCodeNum)
          .limit(1);

        if (restroErr) {
          console.error("restro meta fetch error", restroErr);
        } else if (restroRows && restroRows.length) {
          const rest = restroRows[0] as any;

          // different column name possibilities handle kar liye
          const openRaw =
            rest.OpenTime ?? rest.open_time ?? rest.openTime ?? "";
          const closeRaw =
            rest.CloseTime ??
            rest.ClosedTime ??
            rest.close_time ??
            rest.closeTime ??
            "";

          const restroOpenHHMM = toHHMM(openRaw);
          const restroCloseHHMM = toHHMM(closeRaw);

          const arrMin = hhmmToMinutes(arrivalHHMM);
          const openMin = hhmmToMinutes(restroOpenHHMM);
          const closeMin = hhmmToMinutes(restroCloseHHMM);

          if (
            arrMin !== null &&
            openMin !== null &&
            closeMin !== null &&
            (arrMin < openMin || arrMin > closeMin)
          ) {
            // 👉 yahan fail return kar rahe hain
            return NextResponse.json(
              {
                ok: false,
                error: "restro_time_mismatch",
                meta: {
                  arrival: arrivalHHMM,
                  restroOpen: restroOpenHHMM,
                  restroClose: restroCloseHHMM,
                  stationCode,
                  restroCode: restroCodeNum,
                },
              },
              { status: 400 },
            );
          }
        }
      }
    }

    // ---- 4) Success response ----
    return NextResponse.json({
      ok: true,
      rows,
      meta: {
        stationCode,
        stationName: mainRow.StationName,
        train: trainParam,
        trainName: mainRow.trainName,
        date: dateParam,
        arrival: arrivalHHMM,
        count: rows.length,
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
