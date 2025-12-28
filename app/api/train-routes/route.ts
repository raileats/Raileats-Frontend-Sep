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

function addDays(base: string, diff: number) {
  const d = new Date(`${base}T00:00:00+05:30`);
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function dayOfWeek(dateStr: string): string {
  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return map[new Date(`${dateStr}T00:00:00+05:30`).getDay()];
}

/* ================= API ================= */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const train = (url.searchParams.get("train") || "").trim();
    const station = (url.searchParams.get("station") || "").trim();
    const date = (url.searchParams.get("date") || "").trim() || todayIST();

    if (!train) {
      return NextResponse.json({ ok: true, rows: [] });
    }

    const supa = serviceClient;

    /* ================= TRAIN ROUTE ================= */

    const { data: routeRows } = await supa
      .from("TrainRoute")
      .select(`
        trainNumber, trainName,
        StnNumber, StationCode, StationName,
        Arrives, Departs, Distance, Platform, Day
      `)
      .eq("trainNumber", Number(train))
      .order("StnNumber", { ascending: true });

    if (!routeRows?.length) {
      return NextResponse.json(
        { ok: false, error: "train_not_found" },
        { status: 404 }
      );
    }

    const trainName = routeRows[0].trainName;

    /* ================= BOARDING DATE ================= */

    const firstDay = Number(routeRows[0].Day || 1);
    const boardingDate = addDays(date, 1 - firstDay);

    /* ================= RESTROS ================= */

    const stationCodes = [
      ...new Set(routeRows.map(r => normalize(r.StationCode))),
    ];

    const { data: restros } = await supa
      .from("RestroMaster")
      .select(`
        RestroCode, RestroName, StationCode,
        WeeklyOff, CutOffTime, RaileatsStatus
      `)
      .in("stationcode_norm", stationCodes);

    /* ================= HOLIDAYS ================= */

    const { data: holidays } = await supa
      .from("RestroHolidays")
      .select(`restro_code, start_at, end_at`)
      .is("deleted_at", null);

    const holidayMap: Record<string, any[]> = {};
    for (const h of holidays || []) {
      const key = String(h.restro_code).trim();
      (holidayMap[key] ||= []).push(h);
    }

    const today = todayIST();
    const now = nowIST();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    /* ================= FINAL MAP ================= */

    const mapped = routeRows.map(r => {
      const sc = normalize(r.StationCode);

      // 🔑 station search → arrivalDate = user date
      const arrivalDate = station
        ? date
        : typeof r.Day === "number"
        ? addDays(boardingDate, r.Day - 1)
        : date;

      let arrivalDateTime: Date | null = null;
      if (r.Arrives) {
        const [hh, mm] = r.Arrives.slice(0, 5).split(":");
        arrivalDateTime = new Date(
          `${arrivalDate}T${hh}:${mm}:00+05:30`
        );
      }

      const arrivalDayName = dayOfWeek(arrivalDate);
      const arrivalMinutes = toMinutes(r.Arrives);

      const vendors = (restros || [])
        .filter(x => normalize(x.StationCode) === sc && x.RaileatsStatus === 1)
        .map(x => {
          let available = true;
          const reasons: string[] = [];
          const restroKey = String(x.RestroCode).trim();

          /* ❌ RULE 0: Past date */
          if (arrivalDate < today) {
            available = false;
            reasons.push("Train already departed");
          }

          /* ❌ RULE 1: Weekly Off */
          if (available && x.WeeklyOff) {
            const offs = normalize(x.WeeklyOff)
              .split(",")
              .map(d => d.trim());
            if (offs.includes(arrivalDayName)) {
              available = false;
              reasons.push(`Closed on ${arrivalDayName}`);
            }
          }

          /* ❌ RULE 2: Holiday (arrival time based) */
          if (available && arrivalDateTime) {
            const hs = holidayMap[restroKey] || [];
            if (
              hs.some(h => {
                const s = new Date(h.start_at);
                const e = new Date(h.end_at);
                return arrivalDateTime! >= s && arrivalDateTime! <= e;
              })
            ) {
              available = false;
              reasons.push("Holiday");
            }
          }

          /* ⏰ RULE 3: CUT-OFF (ONLY TODAY) */
          if (
            available &&
            arrivalDate === today &&
            arrivalMinutes != null &&
            x.CutOffTime != null
          ) {
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
      return NextResponse.json({
        ok: true,
        train: { trainNumber: train, trainName },
        rows: mapped.filter(
          r => normalize(r.StationCode) === normalize(station)
        ),
      });
    }

    return NextResponse.json({
      ok: true,
      train: { trainNumber: train, trainName },
      rows: mapped,
      meta: { date, boardingDate },
    });

  } catch (e) {
    console.error("FINAL CUT-OFF FIX error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
