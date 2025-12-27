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

    // build-time safety
    if (!train) {
      return NextResponse.json({ ok: true, build: true, rows: [] });
    }

    const supa = serviceClient;

    /* ========== 1️⃣ TRAIN ROUTE ========== */

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
        { ok: false, error: "train_not_found", train },
        { status: 404 }
      );
    }

    const valid = routeRows.filter(r =>
      matchesRunningDay(r.runningDays, date)
    );
    const rows = valid.length ? valid : routeRows;
    const trainName = rows[0].trainName;

    /* ========== 2️⃣ BOARDING DAY ========== */

    let boardingDay: number | null = null;
    if (boarding) {
      const b = rows.find(
        r => normalize(r.StationCode) === normalize(boarding)
      );
      if (b?.Day != null) boardingDay = Number(b.Day);
    }

    /* ========== 3️⃣ RESTRO MASTER (USE RaileatsStatus) ========== */

    const { data: restros } = await supa
      .from("RestroMaster")
      .select(`
        RestroCode,
        RestroName,
        StationCode,
        "0penTime",
        "ClosedTime",
        WeeklyOff,
        CutOffTime,
        RaileatsStatus
      `);

    /* ========== 4️⃣ RESTRO HOLIDAYS ========== */

    const { data: holidays } = await supa
      .from("RestroHolidays")
      .select(`restro_code, start_date, end_date, is_deleted`)
      .eq("is_deleted", false);

    const holidayMap: Record<number, any[]> = {};
    for (const h of holidays || []) {
      holidayMap[h.restro_code] ||= [];
      holidayMap[h.restro_code].push(h);
    }

    /* ========== 5️⃣ FINAL MAP ========== */

    const mapped = rows.map(r => {
      const sc = normalize(r.StationCode);

      let arrivalDate = date;
      if (typeof r.Day === "number" && boardingDay != null) {
        arrivalDate = addDays(date, r.Day - boardingDay);
      }

      const arrivalTime =
        toMinutes(r.Arrives) ?? toMinutes(r.Departs) ?? null;

      const vendors = (restros || [])
        .filter(
          x =>
            normalize(x.StationCode) === sc &&
            Number(x.RaileatsStatus) === 1   // ✅ FINAL TRUTH
        )
        .map(x => {
          let available = true;
          const reasons: string[] = [];

          /* ---- HOLIDAY CHECK ---- */
          const hs = holidayMap[x.RestroCode] || [];
          if (
            hs.some(
              h => arrivalDate >= h.start_date && arrivalDate <= h.end_date
            )
          ) {
            available = false;
            reasons.push("Holiday");
          }

          /* ---- OPEN / CLOSE TIME ---- */
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

    /* ========== 6️⃣ SINGLE STATION ========== */

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

    /* ========== FINAL ========== */

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
