// 🔴 IMPORTANT: force dynamic (Vercel build fix)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/* ================= TIME HELPERS ================= */

function nowIST() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
}

function todayISTDate() {
  return nowIST().toISOString().slice(0, 10);
}

function normalize(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function addDays(base: string, diff: number) {
  const d = new Date(base + "T00:00:00+05:30");
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function toMinutes(t?: string | null) {
  if (!t) return null;
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

/* ================= API ================= */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const train = (url.searchParams.get("train") || "").trim();
    const station = (url.searchParams.get("station") || "").trim();
    const journeyDate =
      (url.searchParams.get("date") || "").trim() || todayISTDate();

    if (!train) {
      return NextResponse.json({ ok: true, build: true, rows: [] });
    }

    const supa = serviceClient;

    /* ================= TRAIN ROUTE ================= */

    const { data: rows } = await supa
      .from("TrainRoute")
      .select(`
        trainNumber, trainName,
        StnNumber, StationCode, StationName,
        Arrives, Departs, Distance, Platform, Day
      `)
      .eq("trainNumber", Number(train))
      .order("StnNumber", { ascending: true });

    if (!rows || !rows.length) {
      return NextResponse.json({ ok: false, error: "train_not_found" }, { status: 404 });
    }

    const trainName = rows[0].trainName;

    /* ================= RESTROS ================= */

    const stationCodes = [...new Set(rows.map(r => normalize(r.StationCode)))];

    const { data: restros } = await supa
      .from("RestroMaster")
      .select(`
        RestroCode, RestroName, StationCode,
        CutOffTime, RaileatsStatus
      `)
      .in("stationcode_norm", stationCodes);

    const today = todayISTDate();
    const now = nowIST();

    /* ================= FINAL MAP ================= */

    const mapped = rows.map(r => {
      const sc = normalize(r.StationCode);

      // ✅ IRCTC correct arrival date
      const arrivalDate =
        typeof r.Day === "number"
          ? addDays(journeyDate, r.Day - 1)
          : journeyDate;

      const arrivalMin = toMinutes(r.Arrives) ?? toMinutes(r.Departs);

      const vendors = (restros || [])
        .filter(x => normalize(x.StationCode) === sc && x.RaileatsStatus === 1)
        .map(x => {
          let available = true;
          const reasons: string[] = [];

          /* 🔴 RULE 1: JOURNEY DATE PAST → BLOCK */
          if (journeyDate < today) {
            available = false;
            reasons.push("Journey date is in past");
          }

          /* 🔴 RULE 2: CUTOFF */
          if (available && arrivalMin != null && x.CutOffTime) {
            const [h, m] = r.Arrives.slice(0, 5).split(":").map(Number);

            const arrivalDT = new Date(
              `${arrivalDate}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+05:30`
            );

            const lastOrder = new Date(arrivalDT);
            lastOrder.setMinutes(lastOrder.getMinutes() - Number(x.CutOffTime));

            if (now > lastOrder) {
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
      const row = mapped.find(r => normalize(r.StationCode) === normalize(station));
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
      meta: { date: journeyDate },
    });

  } catch (e) {
    console.error("FINAL train-routes error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
