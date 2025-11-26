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

// RestroMaster me actual column names detect karo
function sniffRestroTimes(row: any): { open: string | null; close: string | null } {
  if (!row || typeof row !== "object") return { open: null, close: null };

  let openKey: string | null = null;
  let closeKey: string | null = null;

  for (const key of Object.keys(row)) {
    const lk = key.toLowerCase();
    if (!openKey && lk.includes("open") && lk.includes("time")) {
      openKey = key;
    }
    if (
      !closeKey &&
      (lk.includes("close") || lk.includes("closed")) &&
      lk.includes("time")
    ) {
      closeKey = key;
    }
  }

  const open =
    (openKey ? row[openKey] : null) ??
    row.OpenTime ??
    row.open_time ??
    row.Open_Time ??
    null;

  const close =
    (closeKey ? row[closeKey] : null) ??
    row.CloseTime ??
    row.ClosedTime ??
    row.close_time ??
    row.Close_Time ??
    null;

  return {
    open: open ? String(open) : null,
    close: close ? String(close) : null,
  };
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

    const allTyped = allRows as TrainRouteRow[];

    // sirf selected station ke rows + runningDays filter
    const rowsAtStation = allTyped.filter(
      (r) =>
        (r.StationCode || "").toUpperCase() === stationCode &&
        matchesRunningDay(r.runningDays, dateParam),
    );

    if (!rowsAtStation.length) {
      // train hai, lekin station route me nahi / is date pe nahi aa rahi
      const stationInRoute = allTyped.some(
        (r) => (r.StationCode || "").toUpperCase() === stationCode,
      );
      if (!stationInRoute) {
        return NextResponse.json(
          { ok: false, error: "station_not_on_route" },
          { status: 400 },
        );
      }
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
        const times = sniffRestroTimes(restroRow as any);
        restroOpen = times.open;
        restroClose = times.close;

        const arrRow = rowsAtStation[0];
        const arrTime =
          (arrRow.Arrives && arrRow.Arrives.trim()) ||
          (arrRow.Departs && arrRow.Departs.trim()) ||
          null;

        const arrMin = timeToMinutes(arrTime);
        const openMin = timeToMinutes(restroOpen);
        const closeMin = timeToMinutes(restroClose);

        if (
          arrMin !== null &&
          openMin !== null &&
          closeMin !== null
        ) {
          let arrivalMinutes = arrMin;
          let o = openMin;
          let c = closeMin;

          // Overnight window (e.g. 22:00–03:00)
          if (c <= o) {
            c += 24 * 60;
            if (arrivalMinutes < o) {
              arrivalMinutes += 24 * 60;
            }
          }

          const inWindow =
            arrivalMinutes >= o && arrivalMinutes <= c;

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
