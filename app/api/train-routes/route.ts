// 🔴 IMPORTANT: force dynamic (Vercel build fix)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/* ================= TIME HELPERS ================= */

function todayYMD() {
  return new Date().toISOString().slice(0, 10);
}

function normalize(val: any) {
  return String(val ?? "").trim().toUpperCase();
}

function toMinutes(t?: string | null) {
  if (!t) return null;
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function isTimeBetween(check: number, start: number, end: number) {
  if (start <= end) return check >= start && check <= end;
  return check >= start || check <= end; // overnight
}

function addDays(base: string, diff: number) {
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function matchesRunningDay(runningDays: string | null, dateStr: string) {
  if (!runningDays) return true;
  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const day = map[new Date(dateStr).getDay()];
  const s = runningDays.toUpperCase();
  return s === "DAILY" || s === "ALL" || s.includes(day);
}

/* ================= API ================= */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const train = (url.searchParams.get("train") || "").trim();
    const station = (url.searchParams.get("station") || "").trim();
    const boarding = (url.searchParams.get("boarding") || "").trim();
    const date = (url.searchParams.get("date") || "").trim() || todayYMD();

    if (!train) {
      return NextResponse.json({ ok: true, build: true, rows: [] });
    }

    const supa = serviceClient;

    /* ================= 1️⃣ TRAIN ROUTE ================= */

    const { data: routeRows } = await supa
      .from("TrainRoute")
      .select(`
        trainNumber, trainName, runningDays,
        StnNumber, StationCode, StationName,
        Arrives, Departs, Stoptime, Distance, Platform, Day
      `)
      .eq("trainNumber", Number(train))
      .order("StnNumber", { ascending: true });

    if (!routeRows || !routeRows.length) {
      return NextResponse.json(
        { ok: false, error: "train_not_found" },
        { status: 404 }
      );
    }

    const validRows = routeRows.filter(r =>
      matchesRunningDay(r.runningDays, date)
    );
    const rows = validRows.length ? validRows : routeRows;
    const trainName = rows[0].trainName;

    /* ================= 2️⃣ BOARDING DAY ================= */

    let boardingDay: number | null = null;
    if (boarding) {
      const b = rows.find(
        r => normalize(r.StationCode) === normalize(boarding)
      );
      if (b?.Day != null) boardingDay = Number(b.Day);
    }

    /* ================= 3️⃣ RESTROS ================= */

    const stationCodes = Array.from(
      new Set(rows.map(r => normalize(r.StationCode)))
    );

    const { data: restros } = await supa
      .from("RestroMaster")
      .select(`
        RestroCode, RestroName, StationCode,
        "0penTime", "ClosedTime",
        CutOffTime, RaileatsStatus
      `)
      .in("stationcode_norm", stationCodes);

    /* ================= 4️⃣ FINAL MAP (CutOff Logic) ================= */

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const mapped = rows.map(r => {
      const sc = normalize(r.StationCode);

      let arrivalDate = date;
      if (typeof r.Day === "number" && boardingDay != null) {
        arrivalDate = addDays(date, r.Day - boardingDay);
      }

      const arrivalMinutes =
        toMinutes(r.Arrives) ?? toMinutes(r.Departs);

      const vendors = (restros || [])
        .filter(x => normalize(x.StationCode) === sc && x.RaileatsStatus === 1)
        .map(x => {
          let available = true;
          const reasons: string[] = [];

          /* ---- CutOffTime Logic ---- */
          if (arrivalMinutes != null && x.CutOffTime != null) {
            const lastOrderMinute = arrivalMinutes - Number(x.CutOffTime);

            // same day check only
            if (arrivalDate === todayYMD()) {
              if (currentMinutes > lastOrderMinute) {
                available = false;
                reasons.push("Cut-off time passed");
              }
            }
          }

          /* ---- Open / Close ---- */
          if (arrivalMinutes != null && available) {
            const o = toMinutes(x["0penTime"]);
            const c = toMinutes(x["ClosedTime"]);
            if (o != null && c != null && !isTimeBetween(arrivalMinutes, o, c)) {
              available = false;
              reasons.push("Outside open hours");
            }
          }

          return {
            restroCode: x.RestroCode,
            restroName: x.RestroName,
            available,
            reasons,
          };
        });

      return {
        StnNumber: r.StnNumber,
        StationCode: sc,
        StationName: r.StationName,
        Arrives: r.Arrives,
        Departs: r.Departs,
        Day: r.Day,
        arrivalDate,
        Distance: r.Distance,
        Platform: r.Platform,
        restros: vendors,
        restroCount: vendors.filter(v => v.available).length,
      };
    });

    /* ================= SINGLE STATION ================= */

    if (station) {
      const row = mapped.find(
        r => normalize(r.StationCode) === normalize(station)
      );
      return NextResponse.json({
        ok: true,
        train: { trainNumber: train, trainName },
        rows: row ? [row] : [],
      });
    }

    return NextResponse.json({
      ok: true,
      train: { trainNumber: train, trainName },
      rows: mapped,
      meta: { date, boarding: boarding || null },
    });

  } catch (e) {
    console.error("CutOff API error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
