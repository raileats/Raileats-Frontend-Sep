// 🔴 IMPORTANT: force dynamic (BUILD FIX)
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
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeCode(val: any) {
  return String(val ?? "").toUpperCase().trim();
}

function matchesRunningDay(runningDays: string | null, dateStr: string) {
  if (!runningDays) return true;
  const dayIndex = new Date(dateStr).getDay();
  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const code = map[dayIndex];
  const s = String(runningDays || "").toUpperCase().trim();
  if (!s || s === "DAILY" || s === "ALL") return true;
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

function isActiveValue(val: any) {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  if (typeof val === "string") {
    const t = val.trim().toLowerCase();
    return !(t === "" || t === "false" || t === "0" || t === "no");
  }
  return true;
}

/* ===================== API ===================== */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const trainParam = (url.searchParams.get("train") || "").trim();
    const stationParam = (url.searchParams.get("station") || "").trim();
    const dateParam = (url.searchParams.get("date") || "").trim() || todayYMD();
    const boardingParam = (url.searchParams.get("boarding") || "").trim();

    // 🔴 BUILD-TIME SAFETY (Next.js prerender)
    if (!trainParam) {
      return NextResponse.json(
        { ok: true, build: true, rows: [] },
        { status: 200 }
      );
    }

    const supa = serviceClient;
    let routeRows: TrainRouteRow[] = [];

    /* ===== 1️⃣ FETCH TRAIN ROUTE FROM SUPABASE ===== */

    const isDigits = /^[0-9]+$/.test(trainParam);

    if (isDigits) {
      const { data } = await supa
        .from("TrainRoute")
        .select("*")
        .eq("trainNumber", Number(trainParam))
        .order("StnNumber", { ascending: true });

      if (Array.isArray(data) && data.length) {
        routeRows = data as TrainRouteRow[];
      }
    }

    if (!routeRows.length) {
      return NextResponse.json(
        { ok: false, error: "train_not_found" },
        { status: 404 }
      );
    }

    /* ===== 2️⃣ FILTER BY RUNNING DAY ===== */

    const rowsForDate = routeRows.filter((r) =>
      matchesRunningDay(r.runningDays, dateParam)
    );
    const rowsToUse = rowsForDate.length ? rowsForDate : routeRows;
    const trainName = rowsToUse[0]?.trainName ?? null;

    /* ===== 3️⃣ FETCH RESTRO MASTER ===== */

    const stationCodes = Array.from(
      new Set(rowsToUse.map((r) => normalizeCode(r.StationCode)).filter(Boolean))
    );

    let restrosByStation: Record<string, any[]> = {};

    if (stationCodes.length) {
      const { data: restros } = await supa
        .from("RestroMaster")
        .select(
          'RestroCode, RestroName, StationCode, "0penTime", "ClosedTime", WeeklyOff, MinimumOrdermValue, CutOffTime, IsActive'
        )
        .in("stationcode_norm", stationCodes)
        .limit(3000);

      if (Array.isArray(restros)) {
        for (const r of restros) {
          const sc = normalizeCode(r.StationCode);
          restrosByStation[sc] = restrosByStation[sc] || [];
          restrosByStation[sc].push(r);
        }
      }
    }

    /* ===== 4️⃣ BOARDING DAY ===== */

    let boardingDayValue: number | null = null;
    if (boardingParam) {
      const b = rowsToUse.find(
        (r) => normalizeCode(r.StationCode) === normalizeCode(boardingParam)
      );
      if (b?.Day != null) boardingDayValue = Number(b.Day);
    }

    /* ===== 5️⃣ MAP FINAL RESPONSE ===== */

    const mapped = rowsToUse.map((r) => {
      const sc = normalizeCode(r.StationCode);

      let arrivalDate = dateParam;
      if (typeof r.Day === "number" && boardingDayValue != null) {
        arrivalDate = addDaysToIso(dateParam, r.Day - boardingDayValue);
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

    /* ===== SINGLE STATION MODE ===== */

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

    /* ===== FINAL RESPONSE ===== */

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
