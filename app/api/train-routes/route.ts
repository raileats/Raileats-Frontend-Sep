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

// runningDays text ko "DAILY" / "MON,TUE" type basic check se handle
function matchesRunningDay(runningDays: string | null, dateStr: string) {
  if (!runningDays) return true;

  const dayIndex = new Date(dateStr).getDay(); // 0=Sun..6=Sat
  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const code = map[dayIndex];

  const s = runningDays.toUpperCase().trim();
  if (s === "DAILY" || s === "ALL") return true;

  return s.split(/[ ,/]+/).includes(code);
}

// "08:45" / "08:45:00" => minutes since midnight
function timeToMinutes(t?: string | null): number | null {
  if (!t) return null;
  const s = String(t).trim();
  if (!s) return null;
  const parts = s.split(":");
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
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

    // trainNumber numeric ya text dono handle
    const trainNumAsNumber = Number(trainParam);
    const trainFilterValue = Number.isFinite(trainNumAsNumber)
      ? trainNumAsNumber
      : trainParam;

    // ---- 1) Puri train ka route (saare stations) ----
    const { data: allRows, error: allErr } = await supa
      .from("TrainRoute")
      .select(
        "trainId, trainNumber, trainName, stationFrom, stationTo, runningDays, StnNumber, StationCode, StationName, Arrives, Departs, Stoptime, Distance, Platform, Route, Day",
      )
      .eq("trainNumber", trainFilterValue)
      .order("Route", { ascending: true });

    if (allErr) {
      console.error("train-routes GET supabase error", allErr);
      return NextResponse.json(
        { ok: false, error: "db_error" },
        { status: 500 },
      );
    }

    if (!allRows || allRows.length === 0) {
      // bilkul bhi row nahi -> train hi nahi mili
      return NextResponse.json(
        { ok: false, error: "train_not_found" },
        { status: 404 },
      );
    }

    // sirf selected station ke rows
    const rowsAtStation = (allRows as TrainRouteRow[]).filter(
      (r) =>
        (r.StationCode || "").toUpperCase() === stationCode &&
        matchesRunningDay(r.runningDays, dateParam),
    );

    if (!rowsAtStation.length) {
      // train hai, lekin station route me nahi / is date pe nahi aa rahi
      // pehle check: kya station route me kabhi aata hai?
      const stationInRoute = (allRows as TrainRouteRow[]).some(
        (r) => (r.StationCode || "").toUpperCase() === stationCode,
      );
      if (!stationInRoute) {
        return NextResponse.json(
          { ok: false, error: "station_not_on_route" },
          { status: 400 },
        );
      }
      // station route me hai, par is date ke runningDays me nahi
      return NextResponse.json(
        { ok: false, error: "not_running_on_date" },
        { status: 400 },
      );
    }

    // ---- 2) Restro open/close time check (agar restro param diya hai) ----
    let restroOpen: string | null = null;
    let restroClose: string | null = null;

    if (restroParam) {
      const restroCodeNum = Number(restroParam);
      const restroFilter = Number.isFinite(restroCodeNum)
        ? restroCodeNum
        : restroParam;

      const { data: restroRow, error: restroErr } = await supa
        .from("RestroMaster")
        .select("*")
        .eq("RestroCode", restroFilter)
        .maybeSingle();

      if (restroErr) {
        console.error("RestroMaster fetch error", restroErr);
      } else if (restroRow) {
        // yahan hum different possible column names try kar rahe hain
        const r: any = restroRow;
        restroOpen =
          r.OpenTime ||
          r.open_time ||
          r.Open_Time ||
          r.openTime ||
          r.open_time_at_station ||
          null;
        restroClose =
          r.CloseTime ||
          r.ClosedTime ||
          r.close_time ||
          r.Close_Time ||
          r.closeTime ||
          r.close_time_at_station ||
          null;

        const arrRow = rowsAtStation[0];
        const arrTime =
          arrRow.Arrives && arrRow.Arrives.trim()
            ? arrRow.Arrives
            : arrRow.Departs;

        const arrMin = timeToMinutes(arrTime);
        const openMin = timeToMinutes(restroOpen);
        const closeMin = timeToMinutes(restroClose);

        if (
          arrMin !== null &&
          openMin !== null &&
          closeMin !== null
        ) {
          let o = openMin;
          let c = closeMin;

          // agar outlet raat bhar khula (close < open) hai to close ko +24h kar do
          if (c <= o) {
            c += 24 * 60;
            if (arrMin < o) {
              // arrival bhi next-day window me ho sakta hai
              // simple case: agar bahut chhota hai to +24h kar do
              arrMin + 24 * 60;
            }
          }

          const inWindow = arrMin >= o && arrMin <= c;

          if (!inWindow) {
            // outlet time se bahar => error
            return NextResponse.json(
              {
                ok: false,
                error: "restro_time_mismatch",
                meta: {
                  arrival: arrTime,
                  restroOpen,
                  restroClose,
                },
              },
              { status: 400 },
            );
          }
        }
      }
    }

    // ---- 3) Success response ----
    const rows = rowsAtStation;

    return NextResponse.json({
      ok: true,
      rows,
      meta: {
        stationCode,
        stationName: rows[0]?.StationName || null,
        train: trainParam,
        date: dateParam,
        count: rows.length,
        arrival: rows[0]?.Arrives || rows[0]?.Departs || null,
        restroOpen,
        restroClose,
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
