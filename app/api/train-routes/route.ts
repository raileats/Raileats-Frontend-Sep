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
    const modeParam = (url.searchParams.get("mode") || "").trim().toLowerCase(); // exact | partial | ''
    const supa = serviceClient;

    if (!trainParam) {
      return NextResponse.json({ ok: false, error: "missing_train" }, { status: 400 });
    }

    // ---- 1) TWO-STEP DB FETCH (exact numeric first, then partial ilike) ----
    const q = trainParam;
    const isDigits = /^[0-9]+$/.test(q);
    let routeRows: any[] = [];

    // Try numeric exact if digits and mode allows
    if ((modeParam === "exact" || modeParam === "") && isDigits) {
      const num = Number(q);
      const { data: exactData, error: exactErr } = await supa
        .from("TrainRoute")
        .select(
          "trainId, trainNumber, trainName, stationFrom, stationTo, runningDays, StnNumber, StationCode, StationName, Arrives, Departs, Stoptime, Distance, Platform, Route, Day",
        )
        .eq("trainNumber", num)
        .order("StnNumber", { ascending: true });

      if (exactErr) {
        console.error("train-routes exact supabase error", exactErr);
      } else if (Array.isArray(exactData) && exactData.length > 0) {
        routeRows = exactData;
      }
    }

    // If still empty or mode=partial, try partial search (trainName or trainNumber_text)
    if (!routeRows.length) {
      const searchQ = q.trim();
      const ilikeQ = `%${searchQ}%`;

      const { data: partialData, error: partialErr } = await supa
        .from("TrainRoute")
        .select(
          "trainId, trainNumber, trainName, stationFrom, stationTo, runningDays, StnNumber, StationCode, StationName, Arrives, Departs, Stoptime, Distance, Platform, Route, Day",
        )
        .or(`trainName.ilike.${ilikeQ},trainNumber_text.ilike.${ilikeQ}`)
        .order("StnNumber", { ascending: true })
        .limit(200);

      if (partialErr) {
        console.error("train-routes partial supabase error", partialErr);
        return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
      }
      if (Array.isArray(partialData) && partialData.length > 0) {
        routeRows = partialData;
      }
    }

    const allRows: TrainRouteRow[] = (routeRows || []) as any[];

    if (!allRows.length) {
      return NextResponse.json({ ok: false, error: "train_not_found" }, { status: 404 });
    }

    // ---- 2) apply running-day filter if possible ----
    const rowsForDate = allRows.filter((r) => matchesRunningDay(r.runningDays, dateParam));
    const rowsToUse = rowsForDate.length ? rowsForDate : allRows;
    const trainName = allRows[0].trainName ?? null;

    // ---- 3) fetch RestroMaster in one go for all stations in route ----
    const stationCodes = Array.from(
      new Set(rowsToUse.map((r) => (r.StationCode || "").toUpperCase()).filter(Boolean)),
    );

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

    // ---- 4) compute boardingDayValue if boarding provided ----
    let boardingDayValue: number | null = null;
    if (boardingParam) {
      const b = rowsToUse.find((r) => (r.StationCode || "").toUpperCase() === boardingParam.toUpperCase());
      if (b && typeof b.Day !== "undefined" && b.Day !== null) {
        boardingDayValue = Number(b.Day);
      }
    }

    // ---- 5) map rows to response (attach restros + arrivalDate etc) ----
    const mapped = rowsToUse.map((r) => {
      const sc = (r.StationCode || "").toUpperCase();
      const arrivalTime = (r.Arrives || r.Departs || "") ? (r.Arrives || r.Departs || "").slice(0, 5) : null;

      let arrivalDate = dateParam;
      if (typeof r.Day === "number" && boardingDayValue != null) {
        const diff = Number(r.Day) - Number(boardingDayValue);
        arrivalDate = addDaysToIso(dateParam, diff);
      } else {
        if (typeof r.Day === "number") {
          const baseDay = Number(rowsToUse[0].Day ?? 1);
          const diff = Number(r.Day) - baseDay;
          arrivalDate = addDaysToIso(dateParam, diff);
        } else {
          arrivalDate = dateParam;
        }
      }

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

      const blockedReasons: string[] = [];
      if (!restros.length) blockedReasons.push("No vendor mapped at this station");

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

    // If a single station requested, filter and return station-specific
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

    // success: full route / mapped
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
