// 🔴 IMPORTANT: force dynamic (Vercel build fix)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/* ================= HELPERS ================= */

function todayYMD() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
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
      .select(`
        "trainId",
        "trainNumber",
        "trainName",
        "stationFrom",
        "stationTo",
        "runningDays",
        "StnNumber",
        "StationCode",
        "StationName",
        "Arrives",
        "Departs",
        "Stoptime",
        "Distance",
        "Platform",
        "Day"
      `)
      .eq("trainNumber", Number(train))
      .order("StnNumber", { ascending: true });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    if (!rows || rows.length === 0) {
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

    /* ===== 4️⃣ MAP FINAL RESPONSE ===== */

    const mapped = routeRows.map(r => {
      let arrivalDate = date;

      if (typeof r.Day === "number" && boardingDay != null) {
        arrivalDate = addDays(date, r.Day - boardingDay);
      }

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
      };
    });

    /* ===== 5️⃣ SINGLE STATION MODE ===== */

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
