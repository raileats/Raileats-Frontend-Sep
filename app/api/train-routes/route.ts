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

    if (!routeRows || !routeRows.length) {
      return NextResponse.json({ ok: false, error: "train_not_found" });
    }

    const trainName = routeRows[0].trainName;

    /* ================= RESTROS ================= */

    const stationCodes = Array.from(
      new Set(routeRows.map(r => normalize(r.StationCode)))
    );

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
      .select(`restro_code, start_at, end_at`)
      .eq("is_deleted", false);

    const holidayMap: Record<number, any[]> = {};
    for (const h of holidays || []) {
      holidayMap[h.restro_code] ||= [];
      holidayMap[h.restro_code].push(h);
    }

    const now = nowIST();
    const today = todayIST();

    /* ================= FINAL MAP ================= */

    const mapped = routeRows.map(r => {
      const sc = normalize(r.StationCode);
      const arrivalDate = date; // 🔑 user date ONLY

      let arrivalUTC: Date | null = null;

      if (r.Arrives) {
        const [hh, mm] = r.Arrives.slice(0, 5).split(":");

        // 🔑 IST EXPLICIT
        const arrivalIST = new Date(
          `${arrivalDate}T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:00+05:30`
        );

        arrivalUTC = new Date(arrivalIST.toISOString());
      }

      const arrivalMinutes = toMinutes(r.Arrives);

      const vendors = (restros || [])
        .filter(x => normalize(x.StationCode) === sc && x.RaileatsStatus === 1)
        .map(x => {
          let available = true;
          const reasons: string[] = [];

          // Past date
          if (arrivalDate < today) {
            available = false;
            reasons.push("Train already departed");
          }

          // HOLIDAY (UTC ↔ UTC)
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

          // Cutoff
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
    });

  } catch (e) {
    console.error("HOLIDAY TIME FIX error:", e);
    return NextResponse.json({ ok: false, error: "server_error" });
  }
}
