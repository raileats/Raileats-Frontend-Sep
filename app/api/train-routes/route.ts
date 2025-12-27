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
             RULE 0️⃣ : PAST DATE BLOCK (MOST IMPORTANT)
          ================================================= */
          if (arrivalDate < todayIST) {
            available = false;
            reasons.push("Train already departed");
          }

          /* =================================================
             RULE 1️⃣ : CUTOFF TIME (FULL DATETIME SAFE)
          ================================================= */
          if (available && x.CutOffTime && r.Arrives) {
            const [ah, am] = r.Arrives.slice(0, 5).split(":").map(Number);

            const arrivalDateTime = new Date(
              `${arrivalDate}T${String(ah).padStart(2, "0")}:${String(am).padStart(2, "0")}:00+05:30`
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

          /* =================================================
             RULE 2️⃣ : OPEN / CLOSE TIME
          ================================================= */
          if (available && r.Arrives && x["0penTime"] && x["ClosedTime"]) {
            const [ah, am] = r.Arrives.slice(0, 5).split(":").map(Number);
            const arrMin = ah * 60 + am;

            const [oh, om] = x["0penTime"].slice(0, 5).split(":").map(Number);
            const [ch, cm] = x["ClosedTime"].slice(0, 5).split(":").map(Number);

            const openMin = oh * 60 + om;
            const closeMin = ch * 60 + cm;

            const inWindow =
              openMin <= closeMin
                ? arrMin >= openMin && arrMin <= closeMin
                : arrMin >= openMin || arrMin <= closeMin;

            if (!inWindow) {
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
    console.error("train-routes FINAL error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
