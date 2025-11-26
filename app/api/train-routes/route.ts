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

// RestroMaster se jo fields chahiye
type RestroMasterRow = {
  RestroCode: number;
  StationCode: string | null;
  OpenTime: string | null;      // "10:00" ya "10:00:00"
  CloseTime: string | null;     // "23:30" etc
  CutOffTimeMins?: number | null;
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

function timeToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const s = String(t).trim();
  if (!s) return null;
  const [hh = "00", mm = "00"] = s.split(":");
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
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

    // ---- 1) Train ka poora route nikaalo (sirf train number se) ----
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

    // train hi nahi mila
    if (!allRows.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "train_not_found",
          meta: { train: trainParam, stationCode, date: dateParam },
        },
        { status: 404 },
      );
    }

    // date ke hisaab se filter
    const dayFiltered = allRows.filter((r) =>
      matchesRunningDay(r.runningDays, dateParam),
    );

    // iss date pe koi run nahi kar rahi
    if (!dayFiltered.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "not_running_on_date",
          meta: { train: trainParam, stationCode, date: dateParam },
        },
        { status: 404 },
      );
    }

    // ab stationCode ke hisaab se rows
    const atStation = dayFiltered.filter(
      (r) => (r.StationCode || "").toUpperCase() === stationCode,
    );

    const firstRouteRow = dayFiltered[0];
    const trainName = firstRouteRow.trainName || null;

    if (!atStation.length) {
      // Train hai lekin iss station par nahi aati
      return NextResponse.json(
        {
          ok: false,
          error: "station_not_on_route",
          trainName,
          meta: {
            train: trainParam,
            stationCode,
            date: dateParam,
          },
        },
        { status: 404 },
      );
    }

    // iss station par jis row ko use karenge
    const stationRow = atStation[0];
    const rawArrival = stationRow.Arrives || stationRow.Departs || "00:00";
    const arrivalHHMM = rawArrival.slice(0, 5);
    const arrivalMinutes = timeToMinutes(rawArrival);

    // ---- 2) Restro open / close time validate ----
    let restroOpen: string | null = null;
    let restroClose: string | null = null;
    let restroCutoffMins: number | null = null;

    if (restroParam) {
      const restroCodeNum = Number(restroParam);
      if (Number.isFinite(restroCodeNum)) {
        const { data: restroRows, error: restroErr } = await supa
          .from("RestroMaster")
          .select(
            "RestroCode, StationCode, OpenTime, CloseTime, CutOffTimeMins",
          )
          .eq("RestroCode", restroCodeNum)
          .eq("StationCode", stationCode)
          .limit(1);

        if (restroErr) {
          console.error("train-routes restro fetch error", restroErr);
        }

        const restro = (restroRows || [])[0] as RestroMasterRow | undefined;
        if (restro) {
          restroOpen = restro.OpenTime;
          restroClose = restro.CloseTime;
          if (typeof restro.CutOffTimeMins === "number") {
            restroCutoffMins = restro.CutOffTimeMins;
          }

          const openMins = timeToMinutes(restroOpen);
          const closeMins = timeToMinutes(restroClose);

          if (
            arrivalMinutes != null &&
            openMins != null &&
            closeMins != null &&
            (arrivalMinutes < openMins || arrivalMinutes > closeMins)
          ) {
            // train time restro ke service window se bahar hai
            return NextResponse.json(
              {
                ok: false,
                error: "restro_time_mismatch",
                trainName,
                meta: {
                  train: trainParam,
                  stationCode,
                  date: dateParam,
                  arrival: arrivalHHMM,
                  restroOpen: restroOpen?.slice(0, 5) || null,
                  restroClose: restroClose?.slice(0, 5) || null,
                },
              },
              { status: 400 },
            );
          }
        }
      }
    }

    // sab OK
    return NextResponse.json({
      ok: true,
      rows: atStation,
      meta: {
        stationCode,
        train: trainParam,
        date: dateParam,
        trainName,
        arrival: arrivalHHMM,
        restroOpen: restroOpen ? restroOpen.slice(0, 5) : null,
        restroClose: restroClose ? restroClose.slice(0, 5) : null,
        restroCutoffMins,
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
