// 🔴 IMPORTANT: force dynamic (Vercel build fix)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/* ================= TIME HELPERS ================= */

const IST_OFFSET_MIN = 330; // +5:30

function normalize(val: any) {
  return String(val ?? "").trim().toUpperCase();
}

function parseHHMM(timeStr?: string | null): { h: number; m: number } | null {
  if (!timeStr) return null;
  const parts = timeStr.split(":").map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return { h: parts[0], m: parts[1] };
}

// IST epoch minutes (NO Date timezone bugs)
function istEpochMinutes(dateYMD: string, timeStr: string): number | null {
  const t = parseHHMM(timeStr);
  if (!t) return null;

  const [y, m, d] = dateYMD.split("-").map(Number);

  // UTC millis at IST midnight
  const utcMillis =
    Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MIN * 60 * 1000;

  return (
    Math.floor(utcMillis / 60000) +
    t.h * 60 +
    t.m
  );
}

function nowISTMinutes(): number {
  const now = Date.now();
  return Math.floor(now / 60000) + IST_OFFSET_MIN;
}

function todayISTDate(): string {
  const mins = nowISTMinutes();
  const ms = mins * 60000;
  return new Date(ms).toISOString().slice(0, 10);
}

function addDays(base: string, diff: number) {
  const [y, m, d] = base.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d + diff);
  return new Date(utc).toISOString().slice(0, 10);
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

    if (!routeRows?.length) {
      return NextResponse.json({ ok: false, error: "train_not_found" }, { status: 404 });
    }

    const rows = routeRows.filter(r => matchesRunningDay(r.runningDays, date));
    const trainName = rows[0].trainName;

    /* ================= BOARDING DAY ================= */

    let boardingDay: number | null = null;
    if (boarding) {
      const b = rows.find(r => normalize(r.StationCode) === normalize(boarding));
      if (b?.Day != null) boardingDay = Number(b.Day);
    }

    /* ================= RESTROS ================= */

    const stationCodes = Array.from(new Set(rows.map(r => normalize(r.StationCode))));

    const { data: restros } = await supa
      .from("RestroMaster")
      .select(`
        RestroCode, RestroName, StationCode,
        "0penTime", "ClosedTime",
        CutOffTime, RaileatsStatus
      `)
      .in("stationcode_norm", stationCodes);

    const nowMin = nowISTMinutes();
    const todayIST = todayISTDate();

    /* ================= FINAL MAP ================= */

    const mapped = rows.map(r => {
      const sc = normalize(r.StationCode);

      let arrivalDate = date;
      if (typeof r.Day === "number" && boardingDay != null) {
        arrivalDate = addDays(date, r.Day - boardingDay);
      }

      const arrivalMin =
        istEpochMinutes(arrivalDate, r.Arrives || r.Departs || "");

      const vendors = (restros || [])
        .filter(x => normalize(x.StationCode) === sc && x.RaileatsStatus === 1)
        .map(x => {
          let available = true;
          const reasons: string[] = [];

          /* ---- PAST DATE ---- */
          if (arrivalDate < todayIST) {
            available = false;
            reasons.push("Train already departed");
          }

          /* ---- CUTOFF (100% SAFE) ---- */
          if (available && arrivalMin != null && x.CutOffTime != null) {
            const lastOrderMin = arrivalMin - Number(x.CutOffTime);
            if (nowMin > lastOrderMin) {
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

    if (station) {
      const row = mapped.find(r => normalize(r.StationCode) === normalize(station));
      return NextResponse.json({ ok: true, train: { trainNumber: train, trainName }, rows: row ? [row] : [] });
    }

    return NextResponse.json({ ok: true, train: { trainNumber: train, trainName }, rows: mapped });

  } catch (e) {
    console.error("train-routes error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
