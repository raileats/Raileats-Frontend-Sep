// 🔴 IMPORTANT: force dynamic (Vercel build fix)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/* ================= TIME HELPERS (IST SAFE) ================= */

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

function addDays(base: string, diff: number) {
  const d = new Date(`${base}T00:00:00+05:30`);
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function matchesRunningDay(runningDays: string | null, dateStr: string) {
  if (!runningDays) return true;
  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const day = map[new Date(`${dateStr}T00:00:00`).getDay()];
  const s = runningDays.toUpperCase();
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

    /* ================= 1️⃣ TRAIN ROUTE ================= */

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

    /* ================= 2️⃣ BOARDING DAY DATE ================= */

    const firstDay = Number(rows[0].Day || 1);
    const boardingDate = addDays(date, 1 - firstDay);

    /* ================= 3️⃣ RESTROS ================= */

    const stationCodes = Array.from(
      new Set(rows.map(r => normalize(r.StationCode)))
    );

    const { data: restros } = await supa
      .from("RestroMaster")
      .select(`
        RestroCode, RestroName, StationCode,
        CutOffTime, RaileatsStatus
      `)
      .in("stationcode_norm", stationCodes);

    const now = nowIST();

    /* ================= 4️⃣ FINAL MAP ================= */

    const mapped = rows.map(r => {
      const sc = normalize(r.StationCode);

      // Arrival date from boarding date + day offset
      const arrivalDate =
        typeof r.Day === "number"
          ? addDays(boardingDate, r.Day - 1)
          : date;

      const vendors = (restros || [])
        .filter(x => normalize(x.StationCode) === sc && x.RaileatsStatus === 1)
        .map(x => {
          let available = true;
          const reasons: string[] = [];

          /* ===== Arrival DateTime (IST) ===== */
          if (r.Arrives && x.CutOffTime != null) {
            const [hh, mm, ss] = r.Arrives
              .padEnd(8, "0")
              .split(":")
              .map(Number);

            const arrivalDT = new Date(
              `${arrivalDate}T${String(hh).padStart(2, "0")}:${String(mm).padStart(
                2,
                "0"
              )}:${String(ss || 0).padStart(2, "0")}+05:30`
            );

            const lastOrderDT = new Date(arrivalDT);
            lastOrderDT.setMinutes(
              lastOrderDT.getMinutes() - Number(x.CutOffTime)
            );

            if (now > lastOrderDT) {
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
      meta: { date, boardingDate },
    });

  } catch (e) {
    console.error("FINAL train-routes error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
