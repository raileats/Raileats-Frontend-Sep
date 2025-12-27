// 🔴 IMPORTANT: force dynamic (BUILD + PRERENDER FIX)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/* ===================== TYPES ===================== */

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

/* ===================== HELPERS ===================== */

function todayYMD() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function normalizeCode(v: any) {
  return String(v ?? "").toUpperCase().trim();
}

function matchesRunningDay(runningDays: string | null, dateStr: string) {
  if (!runningDays) return true;
  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const code = map[new Date(dateStr).getDay()];
  const s = runningDays.toUpperCase();
  if (s === "DAILY" || s === "ALL") return true;
  return s.split(/[ ,/]+/).includes(code);
}

function addDays(date: string, diff: number) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function isActiveValue(v: any) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return !["0", "false", "no"].includes(v.toLowerCase());
  return true;
}

/* ===================== API ===================== */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const trainParam = (url.searchParams.get("train") || "").trim();
    const stationParam = (url.searchParams.get("station") || "").trim();
    const dateParam = url.searchParams.get("date") || todayYMD();
    const boardingParam = (url.searchParams.get("boarding") || "").trim();

    // 🔴 BUILD TIME SAFETY
    if (!trainParam) {
      return NextResponse.json({ ok: true, build: true, rows: [] });
    }

    const supa = serviceClient;
    let routeRows: TrainRouteRow[] = [];

    /* ===================== 1️⃣ TRAIN LOOKUP ===================== */

    // A) trainNumber_text
    {
      const { data } = await supa
        .from("TrainRoute")
        .select("*")
        .eq("trainNumber_text", trainParam)
        .order("StnNumber");

      if (data?.length) routeRows = data;
    }

    // B) trainNumber (numeric)
    if (!routeRows.length && /^[0-9]+$/.test(trainParam)) {
      const { data } = await supa
        .from("TrainRoute")
        .select("*")
        .eq("trainNumber", Number(trainParam))
        .order("StnNumber");

      if (data?.length) routeRows = data;
    }

    // C) trainName fallback
    if (!routeRows.length) {
      const { data } = await supa
        .from("TrainRoute")
        .select("*")
        .ilike("trainName", `%${trainParam}%`)
        .order("StnNumber")
        .limit(500);

      if (data?.length) routeRows = data;
    }

    if (!routeRows.length) {
      return NextResponse.json(
        { ok: false, error: "train_not_found", train: trainParam },
        { status: 404 }
      );
    }

    /* ===================== 2️⃣ RUNNING DAY FILTER ===================== */

    const filtered =
      routeRows.filter((r) => matchesRunningDay(r.runningDays, dateParam)) ||
      routeRows;

    const rowsToUse = filtered.length ? filtered : routeRows;
    const trainName = rowsToUse[0]?.trainName ?? null;

    /* ===================== 3️⃣ RESTRO MASTER ===================== */

    const stationCodes = Array.from(
      new Set(rowsToUse.map((r) => normalizeCode(r.StationCode)).filter(Boolean))
    );

    let restrosByStation: Record<string, any[]> = {};

    if (stationCodes.length) {
      const { data } = await supa
        .from("RestroMaster")
        .select(
          'RestroCode, RestroName, StationCode, "0penTime", "ClosedTime", WeeklyOff, MinimumOrdermValue, CutOffTime, IsActive'
        )
        .in("stationcode_norm", stationCodes)
        .limit(3000);

      if (data) {
        for (const r of data) {
          const sc = normalizeCode(r.StationCode);
          restrosByStation[sc] = restrosByStation[sc] || [];
          restrosByStation[sc].push(r);
        }
      }
    }

    /* ===================== 4️⃣ BOARDING DAY ===================== */

    let boardingDay: number | null = null;
    if (boardingParam) {
      const b = rowsToUse.find(
        (r) => normalizeCode(r.StationCode) === normalizeCode(boardingParam)
      );
      if (b?.Day != null) boardingDay = Number(b.Day);
    }

    /* ===================== 5️⃣ FINAL MAP ===================== */

    const mapped = rowsToUse.map((r) => {
      const sc = normalizeCode(r.StationCode);

      let arrivalDate = dateParam;
      if (typeof r.Day === "number" && boardingDay != null) {
        arrivalDate = addDays(dateParam, r.Day - boardingDay);
      }

      const restros =
        (restrosByStation[sc] || [])
          .filter((x) => isActiveValue(x.IsActive))
          .map((x) => ({
            restroCode: x.RestroCode,
            restroName: x.RestroName,
            openTime: x["0penTime"],
            closeTime: x["ClosedTime"],
            cutOff: x.CutOffTime,
            minOrder: x.MinimumOrdermValue,
          })) || [];

      return {
        StnNumber: r.StnNumber,
        StationCode: sc,
        StationName: r.StationName,
        Arrives: r.Arrives,
        Departs: r.Departs,
        Day: r.Day,
        arrivalDate,
        Platform: r.Platform,
        Distance: r.Distance,
        restros,
        restroCount: restros.length,
        blocked: restros.length === 0,
      };
    });

    /* ===================== SINGLE STATION ===================== */

    if (stationParam) {
      const sc = normalizeCode(stationParam);
      const row = mapped.find((m) => m.StationCode === sc);
      if (!row) {
        return NextResponse.json(
          { ok: false, error: "station_not_on_route" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        ok: true,
        train: { trainNumber: trainParam, trainName },
        rows: [row],
      });
    }

    /* ===================== FINAL ===================== */

    return NextResponse.json({
      ok: true,
      train: { trainNumber: trainParam, trainName },
      rows: mapped,
      meta: { date: dateParam, boarding: boardingParam || null },
    });
  } catch (e) {
    console.error("train-routes error", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
