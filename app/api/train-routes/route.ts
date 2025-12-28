// 🔴 IMPORTANT: force dynamic (Vercel build fix)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/* ================= IST HELPERS ================= */

// 🔑 IST NOW (safe)
function nowIST(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
}

function todayIST(): string {
  return nowIST().toISOString().slice(0, 10);
}

function normalize(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function toMinutes(t?: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

/* =================================================
   🔥 CRITICAL FIX — IST DAY (NO UTC CONVERSION)
================================================= */
function dayOfWeekIST(dateStr: string): string {
  // dateStr = YYYY-MM-DD
  const [y, m, d] = dateStr.split("-").map(Number);

  // Noon IST to avoid UTC rollover bugs
  const istDate = new Date(y, m - 1, d, 12, 0, 0);

  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return map[istDate.getDay()];
}

function matchesRunningDay(runningDays: string | null, dateStr: string) {
  if (!runningDays) return true;

  const day = dayOfWeekIST(dateStr); // ✅ IST SAFE
  const s = normalize(runningDays);

  return s === "DAILY" || s === "ALL" || s.includes(day);
}

/* ================= API ================= */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const train = (url.searchParams.get("train") || "").trim();
    const station = (url.searchParams.get("station") || "").trim();
    const date = (url.searchParams.get("date") || "").trim() || todayIST();

    if (!train) {
      return NextResponse.json({ ok: true, build: true, rows: [] });
    }

    const supa = serviceClient;

    /* ================= TRAIN ROUTE ================= */

    const { data: routeRows } = await supa
      .from("TrainRoute")
      .select(`
        trainNumber, trainName, runningDays,
        StnNumber, StationCode, StationName,
        Arrives, Departs, Distance, Platform, Day
      `)
      .eq("trainNumber", Number(train))
      .order("StnNumber", { ascending: true });

    if (!routeRows || !routeRows.length) {
      return NextResponse.json(
        { ok: false, error: "train_not_found" },
        { status: 404 }
      );
    }

    const trainName = routeRows[0].trainName;
    const runningDays = routeRows[0].runningDays;

    /* ================= BOOKING STATION ================= */

    const bookingRow = station
      ? routeRows.find(r => normalize(r.StationCode) === normalize(station))
      : routeRows[0];

    if (!bookingRow || typeof bookingRow.Day !== "number") {
      return NextResponse.json({ ok: false, error: "station_not_on_route" });
    }

    /* =================================================
       ✅ RUNNING DAY VALIDATION — FINAL & CORRECT
    ================================================= */

    let checkDate = date;

    if (bookingRow.Day > 1) {
      // reverse calculate start date ONLY if Day > 1
      checkDate = new Date(
        new Date(`${date}T12:00:00`).getTime() -
          (bookingRow.Day - 1) * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .slice(0, 10);
    }

    // 🔑 IST-based running day check
    if (!matchesRunningDay(runningDays, checkDate)) {
      return NextResponse.json({
        ok: true,
        train: { trainNumber: train, trainName },
        rows: [
          {
            StationCode: normalize(bookingRow.StationCode),
            StationName: bookingRow.StationName,
            arrivalDate: date,
            restros: [],
            restroCount: 0,
            error: "Train does not arrive on selected date",
          },
        ],
      });
    }

    /* ================= RESTROS ================= */

    const stationCodes: string[] = [];
    for (const r of routeRows) {
      const sc = normalize(r.StationCode);
      if (!stationCodes.includes(sc)) stationCodes.push(sc);
    }

    const { data: restros } = await supa
      .from("RestroMaster")
      .select(`
        RestroCode, RestroName, StationCode,
        WeeklyOff, CutOffTime, RaileatsStatus
      `)
      .in("stationcode_norm", stationCodes);

    /* ================= HOLIDAYS (UTC SOURCE OF TRUTH) ================= */

    const { data: holidays } = await supa
      .from("RestroHolidays")
      .select(`restro_code, start_at, end_at`)
      .eq("is_deleted", false);

    const holidayMap: Record<number, any[]> = {};
    for (const h of holidays || []) {
      if (!holidayMap[h.restro_code]) holidayMap[h.restro_code] = [];
      holidayMap[h.restro_code].push(h);
    }

    const now = nowIST();
    const today = todayIST();

    /* ================= FINAL MAP ================= */

    const mapped = routeRows.map(r => {
      const sc = normalize(r.StationCode);
      const arrivalDate = date;

      let arrivalUTC: Date | null = null;
      if (r.Arrives) {
        const [hh, mm] = r.Arrives.slice(0, 5).split(":").map(Number);
        const ist = new Date(
          `${arrivalDate}T${String(hh).padStart(2, "0")}:${String(mm).padStart(
            2,
            "0"
          )}:00+05:30`
        );
        arrivalUTC = new Date(ist.toISOString());
      }

      const arrivalDayName = dayOfWeekIST(arrivalDate);
      const arrivalMinutes = toMinutes(r.Arrives);

      const vendors = (restros || [])
        .filter(x => normalize(x.StationCode) === sc && x.RaileatsStatus === 1)
        .map(x => {
          let available = true;
          const reasons: string[] = [];

          if (arrivalDate < today) {
            available = false;
            reasons.push("Train already departed");
          }

          if (available && x.WeeklyOff) {
            const wo = normalize(x.WeeklyOff);
            if (wo !== "NOOFF") {
              const offs = wo.split(",").map(d => d.trim());
              if (offs.includes(arrivalDayName)) {
                available = false;
                reasons.push(`Closed on ${arrivalDayName}`);
              }
            }
          }

          if (available && arrivalUTC) {
            const hs = holidayMap[x.RestroCode] || [];
            if (
              hs.some(h => {
                const s = new Date(h.start_at);
                const e = new Date(h.end_at);
                return arrivalUTC! >= s && arrivalUTC! <= e;
              })
            ) {
              available = false;
              reasons.push("Holiday");
            }
          }

          if (
            available &&
            arrivalDate === today &&
            arrivalMinutes != null &&
            x.CutOffTime != null
          ) {
            const nowMin = now.getHours() * 60 + now.getMinutes();
            if (nowMin > arrivalMinutes - Number(x.CutOffTime)) {
              available = false;
              reasons.push("Cut-off time passed");
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
      meta: { date },
    });

  } catch (e) {
    console.error("FINAL RUNNING-DAY IST FIX error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
