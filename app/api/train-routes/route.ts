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

function matchesRunningDay(runningDays: string | null, dateStr: string) {
  if (!runningDays) return true;
  const dayIndex = new Date(dateStr).getDay();
  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const code = map[dayIndex];
  const s = runningDays.toUpperCase().trim();
  if (s === "DAILY" || s === "ALL") return true;
  return s.split(/[ ,/]+/).includes(code);
}

function toMinutes(hhmm: string | null | undefined): number {
  if (!hhmm) return -1;
  const parts = String(hhmm).trim().split(":");
  const hh = Number(parts[0] || 0);
  const mm = Number(parts[1] || 0);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return -1;
  return hh * 60 + mm;
}

function fmtHHMM(hhmm: string | null | undefined) {
  if (!hhmm) return "";
  const [hh = "00", mm = "00"] = String(hhmm).split(":");
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
}

function addDaysToIso(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const trainParam = (url.searchParams.get("train") || "").trim();
    const stationParam = (url.searchParams.get("station") || "").trim(); // optional
    const dateParam = (url.searchParams.get("date") || "").trim() || todayYMD();
    const boardingParam = (url.searchParams.get("boarding") || "").trim() || ""; // optional boarding station code
    const supa = serviceClient;

    if (!trainParam) {
      return NextResponse.json({ ok: false, error: "missing_train" }, { status: 400 });
    }

    const trainNumAsNumber = Number(trainParam);
    const trainFilterValue = Number.isFinite(trainNumAsNumber) ? trainNumAsNumber : trainParam;

    // 1) Fetch full route (ordered by StnNumber)
    const { data: routeData, error: routeErr } = await supa
      .from("TrainRoute")
      .select(
        "trainId, trainNumber, trainName, stationFrom, stationTo, runningDays, StnNumber, StationCode, StationName, Arrives, Departs, Stoptime, Distance, Platform, Route, Day",
      )
      .eq("trainNumber", trainFilterValue)
      .order("StnNumber", { ascending: true });

    if (routeErr) {
      console.error("train-routes supabase error", routeErr);
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    const allRows: TrainRouteRow[] = (routeData || []) as any[];

    if (!allRows.length) {
      return NextResponse.json({ ok: false, error: "train_not_found" }, { status: 404 });
    }

    // optionally apply running-day filter (for full route return only rows where train runs)
    const rowsForDate = allRows.filter((r) => matchesRunningDay(r.runningDays, dateParam));
    const rowsToUse = rowsForDate.length ? rowsForDate : allRows;

    // If API caller asked only for full route (no station param) -> return route + train meta
    // BUT we also attach restro counts for each station server-side to avoid many client calls
    const trainName = allRows[0].trainName ?? null;

    // build station list to fetch restros in one go (or per station)
    const stationCodes = Array.from(new Set(rowsToUse.map((r) => (r.StationCode || "").toUpperCase()).filter(Boolean)));

    // 2) Fetch RestroMaster rows for these stations (single query)
    // Note: Admin table fields may vary; adjust select if needed.
    let restrosByStation: Record<string, any[]> = {};
    try {
      const { data: restroRows, error: restroErr } = await supa
        .from("RestroMaster")
        .select(
          "RestroCode, RestroName, StationCode, StationName, \"0penTime\", \"ClosedTime\", WeeklyOff, MinimumOrdermValue, CutOffTime, IsActive",
        )
        .in("StationCode", stationCodes)
        .limit(1000);

      if (restroErr) {
        console.error("restromaster fetch err", restroErr);
      } else if (restroRows && restroRows.length) {
        for (const r of restroRows as any[]) {
          const sc = (r.StationCode || "").toUpperCase();
          restrosByStation[sc] = restrosByStation[sc] || [];
          restrosByStation[sc].push(r);
        }
      }
    } catch (e) {
      console.error("restro fetch failed", e);
    }

    // if boarding param provided, find boardingDayValue
    let boardingDayValue: number | null = null;
    if (boardingParam) {
      const b = rowsToUse.find((r) => (r.StationCode || "").toUpperCase() === boardingParam.toUpperCase());
      if (b && typeof b.Day !== "undefined" && b.Day !== null) {
        boardingDayValue = Number(b.Day);
      }
    }

    // map rows to the response shape and attach restro info & computed arrival date
    const mapped = rowsToUse.map((r) => {
      const sc = (r.StationCode || "").toUpperCase();
      const arrivalTime = (r.Arrives || r.Departs || "") ? (r.Arrives || r.Departs || "").slice(0, 5) : null;
      // compute arrival date: if boardingDayValue known and station.Day known -> offset
      let arrivalDate = dateParam;
      if (typeof r.Day === "number" && boardingDayValue != null) {
        const diff = Number(r.Day) - Number(boardingDayValue);
        arrivalDate = addDaysToIso(dateParam, diff);
      } else {
        // fallback: if station.Day present, try to align with first row Day (assume first row Day is 1)
        if (typeof r.Day === "number") {
          const baseDay = Number(rowsToUse[0].Day ?? 1);
          const diff = Number(r.Day) - baseDay;
          arrivalDate = addDaysToIso(dateParam, diff);
        } else {
          arrivalDate = dateParam;
        }
      }

      // attach restro list & simple blocked reasons (server-side)
      const restros = (restrosByStation[sc] || []).map((x: any) => ({
        restroCode: x.RestroCode,
        restroName: x.RestroName,
        isActive: x.IsActive ?? true,
        openTime: x["0penTime"] ?? null,
        closeTime: x["ClosedTime"] ?? null,
        weeklyOff: x.WeeklyOff ?? null,
        minOrder: x.MinimumOrdermValue ?? null,
        cutOff: x.CutOffTime ?? null,
      }));

      // compute a few reasons why a restro might be blocked (informational)
      const blockedReasons: string[] = [];
      if (!restros.length) blockedReasons.push("No vendor mapped at this station");
      // (more precise checks like weekly off/holiday will be performed when checking specific restro)

      return {
        StnNumber: r.StnNumber,
        StationCode: sc,
        StationName: r.StationName,
        Day: typeof r.Day === "number" ? Number(r.Day) : null,
        Arrives: r.Arrives ?? null,
        Departs: r.Departs ?? null,
        arrivalTime,
        arrivalDate,
        Platform: r.Platform ?? null,
        Distance: r.Distance ?? null,
        runningDays: r.runningDays ?? null,
        restros,
        restroCount: restros.length,
        blockedReasons,
        raw: r,
      };
    });

    // If stationParam provided — filter to that station and return station-specific checks
    if (stationParam) {
      const stationCode = stationParam.toUpperCase();
      const stationRows = mapped.filter((m) => (m.StationCode || "").toUpperCase() === stationCode);
      if (!stationRows.length) {
        return NextResponse.json({ ok: false, error: "station_not_on_route", meta: { train: trainParam, stationCode } }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        train: { trainNumber: trainParam, trainName },
        rows: stationRows,
        meta: { stationCode, date: dateParam },
      });
    }

    // success: full route
    return NextResponse.json({
      ok: true,
      train: { trainNumber: trainParam, trainName },
      rows: mapped,
      meta: { date: dateParam, boarding: boardingParam || null },
    });
  } catch (e) {
    console.error("train-routes GET server_error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
