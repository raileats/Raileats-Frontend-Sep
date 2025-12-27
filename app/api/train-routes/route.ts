// 🔴 IMPORTANT: force dynamic (Vercel build fix)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/* ================= TIME HELPERS ================= */

function todayISTDate() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  )
    .toISOString()
    .slice(0, 10);
}

function nowIST() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
}

function normalize(val: any) {
  return String(val ?? "").trim().toUpperCase();
}

// ✅ SAFE TIME PARSER (handles 1:22:00 / 01:22:00)
function parseHHMM(timeStr?: string | null): { h: number; m: number } | null {
  if (!timeStr) return null;
  const parts = timeStr.split(":").map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return { h: parts[0], m: parts[1] };
}

function addDays(base: string, diff: number) {
  const d = new Date(base + "T00:00:00+05:30");
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function matchesRunningDay(runningDays: string | null, dateStr: string) {
  if (!runningDays) return true;
  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const day = map[new Date(dateStr + "T00:00:00").getDay()];
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
    const date = (url.searchParams.get("date") || "").trim() || todayISTDate();

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

    const todayIST = todayISTDate();
    const now = nowIST();

    /* ================= 4️⃣ FINAL MAP ================= */

    const mapped = rows.map(r => {
      const sc = normalize(r.StationCode);

      let arrivalDate = date;
      if (typeof r.Day === "number" && boardingDay != null) {
        arrivalDate = addDays(date, r.Day - boardingDay);
      }

      const vendors = (restros || [])
        .filter(x => normalize(x.StationCode) === sc && x.RaileatsStatus === 1)
        .map(x => {
          let available = true;
          const reasons: string[] = [];

          /* =================================================
             RULE 0️⃣ : PAST DATE BLOCK
          ================================================= */
          if (arrivalDate < todayIST) {
            available = false;
            reasons.push("Train already departed");
          }

          /* =================================================
             RULE 1️⃣ : CUTOFF TIME (FULL DATETIME)
          ================================================= */
          if (available && x.CutOffTime && r.Arrives) {
            const tm = parseHHMM(r.Arrives);
            if (tm) {
              const arrivalDateTime = new Date(
                `${arrivalDate}T${String(tm.h).padStart(2, "0")}:${String(tm.m).padStart(2, "0")}:00+05:30`
              );

              const lastOrderTime = new Date(arrivalDateTime);
              lastOrderTime.setMinutes(
                lastOrderTime.getMinutes() - Number(x.CutOffTime)
              );

              if (now > lastOrderTime) {
                available = false;
                reasons.push("Cut-off time passed");
              }
            }
          }

          /* =================================================
             RULE 2️⃣ : OPEN / CLOSE WINDOW
          ================================================= */
          if (available && r.Arrives && x["0penTime"] && x["ClosedTime"]) {
            const at = parseHHMM(r.Arrives);
            const ot = parseHHMM(x["0penTime"]);
            const ct = parseHHMM(x["ClosedTime"]);

            if (at && ot && ct) {
              const arrMin = at.h * 60 + at.m;
              const openMin = ot.h * 60 + ot.m;
              const closeMin = ct.h * 60 + ct.m;

              const inWindow =
                openMin <= closeMin
                  ? arrMin >= openMin && arrMin <= closeMin
                  : arrMin >= openMin || arrMin <= closeMin;

              if (!inWindow) {
                available = false;
                reasons.push("Outside open hours");
              }
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
    console.error("train-routes FINAL error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
