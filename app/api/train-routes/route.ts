// 🔴 IMPORTANT: force dynamic (Vercel build fix)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/* ================= HELPERS ================= */

function todayYMD() {
  return new Date().toISOString().slice(0, 10);
}

function normalize(val: any) {
  return String(val ?? "").trim().toUpperCase();
}

function matchesRunningDay(runningDays: string | null, dateStr: string) {
  if (!runningDays) return true;

  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const day = map[new Date(dateStr).getDay()];
  const s = runningDays.toUpperCase();

  if (s === "DAILY" || s === "ALL") return true;
  return s.includes(day);
}

function addDays(base: string, diff: number) {
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/* ================= TIME HELPERS ================= */

function timeToMinutes(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function dayCodeFromDate(dateStr: string) {
  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return map[new Date(dateStr).getDay()];
}

function isActiveValue(val: any) {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  if (typeof val === "string") {
    const t = val.trim().toLowerCase();
    return !(t === "false" || t === "0" || t === "no");
  }
  return true;
}

/* ================= RESTRO AVAILABILITY ================= */

function evaluateRestroAvailability({
  restro,
  arrivalTime,
  arrivalDate,
}: {
  restro: any;
  arrivalTime: string | null;
  arrivalDate: string;
}) {
  const reasons: string[] = [];

  if (!isActiveValue(restro.IsActive)) {
    reasons.push("Vendor inactive");
  }

  const todayCode = dayCodeFromDate(arrivalDate);
  if (
    restro.WeeklyOff &&
    restro.WeeklyOff.toUpperCase().includes(todayCode)
  ) {
    reasons.push("Weekly off");
  }

  const arrMin = timeToMinutes(arrivalTime);
  const openMin = timeToMinutes(restro["0penTime"]);
  const closeMin = timeToMinutes(restro["ClosedTime"]);

  if (
    arrMin != null &&
    openMin != null &&
    closeMin != null &&
    (arrMin < openMin || arrMin > closeMin)
  ) {
    reasons.push("Restaurant closed at arrival time");
  }

  if (
    restro.CutOffTime != null &&
    arrMin != null &&
    openMin != null
  ) {
    const latestOrderMin = arrMin - Number(restro.CutOffTime);
    if (latestOrderMin < openMin) {
      reasons.push("Cut-off time exceeded");
    }
  }

  return {
    isAvailable: reasons.length === 0,
    blockedReasons: reasons,
  };
}

/* ================= API ================= */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const train = (url.searchParams.get("train") || "").trim();
    const station = (url.searchParams.get("station") || "").trim();
    const boarding = (url.searchParams.get("boarding") || "").trim();
    const date = (url.searchParams.get("date") || "").trim() || todayYMD();

    // Build-time safety
    if (!train) {
      return NextResponse.json({ ok: true, build: true, rows: [] });
    }

    const supa = serviceClient;

    /* ===== 1️⃣ FETCH TRAIN ROUTE ===== */

    const { data: rows, error } = await supa
      .from("TrainRoute")
      .select("*")
      .eq("trainNumber", Number(train))
      .order("StnNumber", { ascending: true });

    if (error || !rows || rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "train_not_found", train },
        { status: 404 }
      );
    }

    /* ===== 2️⃣ FILTER BY RUNNING DAY ===== */

    const validRows = rows.filter(r =>
      matchesRunningDay(r.runningDays, date)
    );

    const routeRows = validRows.length ? validRows : rows;
    const trainName = routeRows[0].trainName;

    /* ===== 3️⃣ BOARDING DAY ===== */

    let boardingDay: number | null = null;
    if (boarding) {
      const b = routeRows.find(
        r => normalize(r.StationCode) === normalize(boarding)
      );
      if (b?.Day != null) boardingDay = Number(b.Day);
    }

    /* ===== 4️⃣ FETCH RESTROS ===== */

    const stationCodes = Array.from(
      new Set(routeRows.map(r => normalize(r.StationCode)))
    );

    const { data: restros } = await supa
      .from("RestroMaster")
      .select(`
        RestroCode,
        RestroName,
        StationCode,
        "0penTime",
        "ClosedTime",
        WeeklyOff,
        MinimumOrdermValue,
        CutOffTime,
        IsActive
      `)
      .in("stationcode_norm", stationCodes)
      .limit(3000);

    const restroMap: Record<string, any[]> = {};
    (restros || []).forEach(r => {
      const sc = normalize(r.StationCode);
      restroMap[sc] = restroMap[sc] || [];
      restroMap[sc].push(r);
    });

    /* ===== 5️⃣ MAP FINAL RESPONSE ===== */

    const mapped = routeRows.map(r => {
      let arrivalDate = date;
      if (typeof r.Day === "number" && boardingDay != null) {
        arrivalDate = addDays(date, r.Day - boardingDay);
      }

      const arrivalTime = r.Arrives || r.Departs || null;
      const sc = normalize(r.StationCode);

      const restroList = (restroMap[sc] || []).map(restro => {
        const availability = evaluateRestroAvailability({
          restro,
          arrivalTime,
          arrivalDate,
        });

        return {
          restroCode: restro.RestroCode,
          restroName: restro.RestroName,
          openTime: restro["0penTime"],
          closeTime: restro["ClosedTime"],
          weeklyOff: restro.WeeklyOff,
          minOrder: restro.MinimumOrdermValue,
          cutOff: restro.CutOffTime,
          isAvailable: availability.isAvailable,
          blockedReasons: availability.blockedReasons,
        };
      });

      return {
        StnNumber: r.StnNumber,
        StationCode: r.StationCode,
        StationName: r.StationName,
        Arrives: r.Arrives,
        Departs: r.Departs,
        Stoptime: r.Stoptime,
        Day: r.Day,
        arrivalDate,
        Distance: r.Distance,
        Platform: r.Platform,
        restros: restroList,
        restroCount: restroList.filter(r => r.isAvailable).length,
      };
    });

    /* ===== 6️⃣ SINGLE STATION MODE ===== */

    if (station) {
      const row = mapped.find(
        r => normalize(r.StationCode) === normalize(station)
      );

      if (!row) {
        return NextResponse.json(
          { ok: false, error: "station_not_on_route" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        ok: true,
        train: { trainNumber: train, trainName },
        rows: [row],
      });
    }

    /* ===== FINAL ===== */

    return NextResponse.json({
      ok: true,
      train: { trainNumber: train, trainName },
      rows: mapped,
      meta: { date, boarding: boarding || null },
    });

  } catch (e) {
    console.error("train-routes API error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
