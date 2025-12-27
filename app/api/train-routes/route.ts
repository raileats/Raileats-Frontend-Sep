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
  // overnight window (22:00 – 06:00)
  return check >= start || check <= end;
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

    // build-time safety
    if (!train) {
      return NextResponse.json({ ok: true, build: true, rows: [] });
    }

    const supa = serviceClient;

    /* ================= 1️⃣ TRAIN ROUTE ================= */

    const { data: routeRows, error: routeErr } = await supa
      .from("TrainRoute")
      .select(`
        trainNumber, trainName, runningDays,
        StnNumber, StationCode, StationName,
        Arrives, Departs, Stoptime, Distance, Platform, Day
      `)
      .eq("trainNumber", Number(train))
      .order("StnNumber", { ascending: true });

    if (routeErr || !routeRows || !routeRows.length) {
      return NextResponse.json(
        { ok: false, error: "train_not_found", train },
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

    /* ================= 3️⃣ STATION CODES ================= */

    const stationCodes = Array.from(
      new Set(rows.map(r => normalize(r.StationCode)))
    );

    /* ================= 4️⃣ RESTRO MASTER ================= */

    const { data: restros } = await supa
      .from("RestroMaster")
      .select(`
        RestroCode, RestroName, StationCode,
        "0penTime", "ClosedTime",
        WeeklyOff, CutOffTime, IsActive
      `)
      .in("stationcode_norm", stationCodes);

    /* ================= 5️⃣ RESTRO TIME OVERRIDE ================= */

    const { data: restroTimes } = await supa
      .from("RestroTime")
      .select(`restro_code, start_at, end_at, is_deleted`)
      .eq("is_deleted", false);

    const timeMap: Record<number, any[]> = {};
    for (const t of restroTimes || []) {
      timeMap[t.restro_code] ||= [];
      timeMap[t.restro_code].push(t);
    }

    /* ================= 6️⃣ RESTRO HOLIDAYS ================= */

    const { data: holidays } = await supa
      .from("RestroHolidays")
      .select(`restro_code, start_at, end_at, is_deleted`)
      .eq("is_deleted", false);

    const holidayMap: Record<number, any[]> = {};
    for (const h of holidays || []) {
      holidayMap[h.restro_code] ||= [];
      holidayMap[h.restro_code].push(h);
    }

    /* ================= 7️⃣ FINAL MAP ================= */

    const mapped = rows.map(r => {
      const sc = normalize(r.StationCode);

      let arrivalDate = date;
      if (typeof r.Day === "number" && boardingDay != null) {
        arrivalDate = addDays(date, r.Day - boardingDay);
      }

      const arrivalTime =
        toMinutes(r.Arrives) ?? toMinutes(r.Departs) ?? null;

      const vendors = (restros || [])
        .filter(x => normalize(x.StationCode) === sc && x.IsActive)
        .map(x => {
          let available = true;
          const reasons: string[] = [];

          /* ---- HOLIDAY CHECK ---- */
          const hs = holidayMap[x.RestroCode] || [];
          if (
            hs.some(h =>
              arrivalDate >= h.start_at.slice(0, 10) &&
              arrivalDate <= h.end_at.slice(0, 10)
            )
          ) {
            available = false;
            reasons.push("Holiday");
          }

          /* ---- SPECIAL TIME OVERRIDE ---- */
          if (arrivalTime != null && timeMap[x.RestroCode]) {
            const ok = timeMap[x.RestroCode].some(t => {
              const s = toMinutes(
                new Date(t.start_at).toISOString().slice(11, 16)
              );
              const e = toMinutes(
                new Date(t.end_at).toISOString().slice(11, 16)
              );
              return s != null && e != null && isTimeBetween(arrivalTime, s, e);
            });
            if (!ok) {
              available = false;
              reasons.push("Outside special time window");
            }
          }

          /* ---- DEFAULT OPEN / CLOSE ---- */
          if (arrivalTime != null && available) {
            const o = toMinutes(x["0penTime"]);
            const c = toMinutes(x["ClosedTime"]);
            if (o != null && c != null && !isTimeBetween(arrivalTime, o, c)) {
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
        Stoptime: r.Stoptime,
        Day: r.Day,
        arrivalDate,
        Distance: r.Distance,
        Platform: r.Platform,
        restros: vendors,
        restroCount: vendors.filter(v => v.available).length,
      };
    });

    /* ================= 8️⃣ SINGLE STATION ================= */

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

    /* ================= FINAL ================= */

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
