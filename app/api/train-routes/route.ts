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

    const validRows = routeRows.filter(r =>
      matchesRunningDay(r.runningDays, date)
    );
    const rows = validRows.length ? validRows : routeRows;
    const trainName = rows[0].trainName;

    /* ================= RESTROS ================= */

    const stationCodes: string[] = [];
    for (const r of rows) {
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

    /* ================= HOLIDAYS (UTC – SOURCE OF TRUTH) ================= */

    const { data: holidays } = await supa
      .from("RestroHolidays")
      .select(`
        restro_code,
        start_at,
        end_at
      `)
      .eq("is_deleted", false);

    const holidayMap: Record<number, any[]> = {};
    for (const h of holidays || []) {
      const key = Number(h.restro_code);
      if (!holidayMap[key]) holidayMap[key] = [];
      holidayMap[key].push(h);
    }

    const now = nowIST();
    const today = todayIST();

    /* ================= FINAL MAP ================= */

    const mapped = rows.map(r => {
      const sc = normalize(r.StationCode);

      // ✅ FINAL FIX:
      // user-provided date IS the station arrival date
      const arrivalDate = date;

      /* Arrival DateTime (IST → UTC) */
      let arrivalUTC: Date | null = null;
      if (r.Arrives) {
        const [hh, mm] = r.Arrives.slice(0, 5).split(":").map(Number);
        const istDateTime = new Date(
          `${arrivalDate}T${String(hh).padStart(2, "0")}:${String(mm).padStart(
            2,
            "0"
          )}:00+05:30`
        );
        arrivalUTC = new Date(istDateTime.toISOString());
      }

      const arrivalDayName = dayOfWeek(arrivalDate);
      const arrivalMinutes = toMinutes(r.Arrives);

      const vendors = (restros || [])
        .filter(x => normalize(x.StationCode) === sc && x.RaileatsStatus === 1)
        .map(x => {
          let available = true;
          const reasons: string[] = [];

          /* RULE 0: Past date */
          if (arrivalDate < today) {
            available = false;
            reasons.push("Train already departed");
          }

          /* RULE 1: WeeklyOff */
          if (available && x.WeeklyOff) {
            const wo = normalize(x.WeeklyOff);
            if (wo !== "NOOFF") {
              const offDays = wo.split(",").map(d => d.trim());
              if (offDays.includes(arrivalDayName)) {
                available = false;
                reasons.push(`Closed on ${arrivalDayName}`);
              }
            }
          }

          /* RULE 2: HOLIDAY (UTC BASED – CORRECT) */
          if (available && arrivalUTC) {
            const hs = holidayMap[x.RestroCode] || [];
            if (
              hs.some(h => {
                const startUTC = new Date(h.start_at);
                const endUTC = new Date(h.end_at);
                return arrivalUTC! >= startUTC && arrivalUTC! <= endUTC;
              })
            ) {
              available = false;
              reasons.push("Holiday");
            }
          }

          /* RULE 3: CutOffTime */
          if (
            available &&
            arrivalDate === today &&
            arrivalMinutes != null &&
            x.CutOffTime != null
          ) {
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            const lastOrderMinute =
              arrivalMinutes - Number(x.CutOffTime);

            if (nowMinutes > lastOrderMinute) {
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
    console.error("FINAL STATION-DATE FIX error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
