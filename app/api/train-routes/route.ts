// 🔴 IMPORTANT: force dynamic (Vercel build fix)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/* ================= IST HELPERS ================= */

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

function dayOfWeek(dateStr: string): string {
  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return map[new Date(`${dateStr}T00:00:00+05:30`).getDay()];
}

function matchesRunningDay(runningDays: string | null, dateStr: string) {
  if (!runningDays) return true;
  const day = dayOfWeek(dateStr);
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

    /* ================= HOLIDAYS (UTC SOURCE) ================= */

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

      // ✅ user provided date IS arrival date
      const arrivalDate = date;

      // 🚨 NEW LOGIC: Train start date from arrival date
      const trainStartDate =
        typeof r.Day === "number"
          ? new Date(
              new Date(`${arrivalDate}T00:00:00+05:30`).getTime() -
                (r.Day - 1) * 24 * 60 * 60 * 1000
            )
              .toISOString()
              .slice(0, 10)
          : arrivalDate;

      // ❌ Train does NOT start on correct running day
      if (!matchesRunningDay(runningDays, trainStartDate)) {
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
          restros: [],
          restroCount: 0,
          error: "Train does not arrive on selected date",
        };
      }

      /* Arrival UTC */
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

      const arrivalDayName = dayOfWeek(arrivalDate);
      const arrivalMinutes = toMinutes(r.Arrives);

      const vendors = (restros || [])
        .filter(x => normalize(x.StationCode) === sc && x.RaileatsStatus === 1)
        .map(x => {
          let available = true;
          const reasons: string[] = [];

          /* Past date */
          if (arrivalDate < today) {
            available = false;
            reasons.push("Train already departed");
          }

          /* Weekly off */
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

          /* Holiday (UTC safe) */
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

          /* Cutoff */
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
    console.error("FINAL RUNNING-DAY FIX error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
