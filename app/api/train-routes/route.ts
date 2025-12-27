// 🔴 IMPORTANT: force dynamic (BUILD FIX)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

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
  const day = ["SUN","MON","TUE","WED","THU","FRI","SAT"][new Date(dateStr).getDay()];
  const s = runningDays.toUpperCase();
  if (s === "DAILY" || s === "ALL") return true;
  return s.includes(day);
}

/* ===================== API ===================== */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const train = (url.searchParams.get("train") || "").trim();
    const station = (url.searchParams.get("station") || "").trim();
    const date = (url.searchParams.get("date") || "").trim() || todayYMD();

    // ⛑️ build safety
    if (!train) {
      return NextResponse.json({ ok: true, build: true, rows: [] });
    }

    const supa = serviceClient;
    let rows: any[] = [];

    /* ===================== STEP 1: FETCH TRAIN ROUTE ===================== */

    // 1️⃣ exact string match
    let res = await supa
      .from("TrainRoute")
      .select("*")
      .eq("trainNumber", train)
      .order("StnNumber", { ascending: true });

    if (res.data?.length) {
      rows = res.data;
    }

    // 2️⃣ fallback: trainNumber_text
    if (!rows.length) {
      res = await supa
        .from("TrainRoute")
        .select("*")
        .ilike("trainNumber_text", `%${train}%`)
        .order("StnNumber", { ascending: true });

      if (res.data?.length) rows = res.data;
    }

    // 3️⃣ fallback: trainName
    if (!rows.length) {
      res = await supa
        .from("TrainRoute")
        .select("*")
        .ilike("trainName", `%${train}%`)
        .order("StnNumber", { ascending: true });

      if (res.data?.length) rows = res.data;
    }

    if (!rows.length) {
      return NextResponse.json(
        { ok: false, error: "train_not_found", train },
        { status: 404 }
      );
    }

    /* ===================== STEP 2: RUNNING DAY FILTER ===================== */

    const usable = rows.filter(r => matchesRunningDay(r.runningDays, date));
    const route = usable.length ? usable : rows;
    const trainName = route[0]?.trainName ?? null;

    /* ===================== STEP 3: MAP RESPONSE ===================== */

    const mapped = route.map(r => ({
      StnNumber: r.StnNumber,
      StationCode: normalizeCode(r.StationCode),
      StationName: r.StationName,
      Arrives: r.Arrives,
      Departs: r.Departs,
      Day: r.Day,
      Platform: r.Platform,
      Distance: r.Distance
    }));

    if (station) {
      const sc = normalizeCode(station);
      const one = mapped.find(x => x.StationCode === sc);
      if (!one) {
        return NextResponse.json(
          { ok: false, error: "station_not_on_route" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        ok: true,
        train: { trainNumber: train, trainName },
        rows: [one]
      });
    }

    return NextResponse.json({
      ok: true,
      train: { trainNumber: train, trainName },
      rows: mapped,
      meta: { date }
    });

  } catch (e) {
    console.error("train-routes error", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
