// app/api/home/train-search/route.ts
// Train number se: route + us route par jo stations par RestroMaster entries milti hain
// (sirf basic open/close time check ke sath)

import { NextResponse } from "next/server";
import { serviceClient } from "../../../lib/supabaseServer";

type TrainRouteRow = {
  trainId: number;
  trainNumber: number | null;
  trainName: string | null;
  runningDays: string | null;
  StnNumber: number | null;
  StationCode: string | null;
  StationName: string | null;
  Arrives: string | null;
  Departs: string | null;
};

type RestroRow = {
  RestroCode: number;
  RestroName?: string | null;
  StationCode: string | null;
  StationName: string | null;
  MinimumOrdermValue?: number | null;
  // time columns (note: "0penTime" me 0 hai)
  ["0penTime"]?: string | null;
  ClosedTime?: string | null;
};

function todayYMD() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// runningDays "Mon,Tue,Wed..." type field ko given date se match kare
function matchesRunningDay(runningDays: string | null, dateStr: string) {
  if (!runningDays) return true;
  const dayIndex = new Date(dateStr).getDay(); // 0=Sun..6=Sat
  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const code = map[dayIndex];
  const s = runningDays.toUpperCase().trim();
  if (s === "DAILY" || s === "ALL") return true;
  return s.split(/[ ,/]+/).includes(code);
}

function toMinutes(hhmm: string | null | undefined): number {
  if (!hhmm) return -1;
  const [hh, mm] = String(hhmm).trim().slice(0, 5).split(":");
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
  return h * 60 + m;
}

function fmtHHMM(hhmm: string | null | undefined) {
  if (!hhmm) return "";
  const [hh = "00", mm = "00"] = String(hhmm).slice(0, 5).split(":");
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const supa = serviceClient;

  try {
    const url = new URL(req.url);
    const trainParam = (url.searchParams.get("train") || "").trim();
    const dateParam =
      (url.searchParams.get("date") || "").trim() || todayYMD();

    if (!trainParam) {
      return NextResponse.json(
        { ok: false, error: "missing_train_param" },
        { status: 400 },
      );
    }

    const trainNumAsNumber = Number(trainParam);
    const trainFilterValue = Number.isFinite(trainNumAsNumber)
      ? trainNumAsNumber
      : trainParam;

    // 1) TrainRoute se poora route laao
    const { data: routeData, error: routeErr } = await supa
      .from("TrainRoute")
      .select(
        "trainId, trainNumber, trainName, runningDays, StnNumber, StationCode, StationName, Arrives, Departs",
      )
      .eq("trainNumber", trainFilterValue)
      .order("StnNumber", { ascending: true });

    if (routeErr) {
      console.error("home/train-search route error", routeErr);
      return NextResponse.json(
        { ok: false, error: "train_route_db_error" },
        { status: 500 },
      );
    }

    const allRows: TrainRouteRow[] = (routeData || []) as any[];
    if (!allRows.length) {
      return NextResponse.json(
        { ok: false, error: "train_not_found" },
        { status: 404 },
      );
    }

    // running day filter
    const dayRows = allRows.filter((r) =>
      matchesRunningDay(r.runningDays, dateParam),
    );
    if (!dayRows.length) {
      return NextResponse.json(
        { ok: false, error: "not_running_on_date" },
        { status: 400 },
      );
    }

    const first = dayRows[0];
    const trainName = first.trainName ?? "";
    const trainNumber = first.trainNumber ?? trainFilterValue;

    // 2) unique station codes list
    const stationCodes = Array.from(
      new Set(
        dayRows
          .map((r) => (r.StationCode || "").toUpperCase())
          .filter(Boolean),
      ),
    );

    if (!stationCodes.length) {
      return NextResponse.json({
        ok: true,
        train: { trainNumber, trainName },
        stations: [],
      });
    }

    // 3) RestroMaster se sabhi restro jo in stationCodes par hain
    const { data: restroData, error: restroErr } = await supa
      .from("RestroMaster")
      .select(
        'RestroCode, RestroName, StationCode, StationName, MinimumOrdermValue, "0penTime", ClosedTime',
      )
      .in("StationCode", stationCodes);

    if (restroErr) {
      console.error("home/train-search RestroMaster error", restroErr);
      return NextResponse.json(
        { ok: false, error: "restro_master_db_error" },
        { status: 500 },
      );
    }

    const restros: RestroRow[] = (restroData || []) as any[];

    // 4) station-wise summary banao
    const stationsSummary = dayRows.map((row) => {
      const code = (row.StationCode || "").toUpperCase();
      const name = row.StationName || code;

      const rawArr =
        (row.Arrives || row.Departs || "").slice(0, 5) || null;
      const arrivalHHMM = fmtHHMM(rawArr);
      const arrivalMin = toMinutes(rawArr);

      // is station par jitne restro hain
      const restrosHere = restros.filter(
        (r) => (r.StationCode || "").toUpperCase() === code,
      );

      if (!restrosHere.length || arrivalMin < 0) {
        return null;
      }

      // open/close time se filter (agar time null ho to allow kar do)
      const openRestros = restrosHere.filter((r) => {
        const oMin = toMinutes(r["0penTime"] || null);
        const cMin = toMinutes(r.ClosedTime || null);

        if (oMin < 0 || cMin < 0) return true; // time nahi diya → allow
        return arrivalMin >= oMin && arrivalMin <= cMin;
      });

      if (!openRestros.length) return null;

      const minOrder = openRestros.reduce((min, r) => {
        const v = Number(r.MinimumOrdermValue ?? 0);
        if (!Number.isFinite(v) || v <= 0) return min;
        if (min === null) return v;
        return Math.min(min, v);
      }, null as number | null);

      return {
        stationCode: code,
        stationName: name,
        arrivalTime: arrivalHHMM,
        restroCount: openRestros.length,
        minOrder: minOrder,
        // future ke liye: yahan veg / non-veg summary add kar sakte hain
        restros: openRestros.map((r) => ({
          restroCode: r.RestroCode,
          restroName: r.RestroName ?? "",
          minimumOrder: r.MinimumOrdermValue ?? null,
        })),
      };
    });

    const filteredStations = stationsSummary.filter(
      (s): s is NonNullable<typeof s> => !!s,
    );

    return NextResponse.json({
      ok: true,
      train: {
        trainNumber,
        trainName,
        date: dateParam,
      },
      stations: filteredStations,
    });
  } catch (e) {
    console.error("home/train-search server_error", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }
}
