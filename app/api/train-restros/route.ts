// app/api/train-restros/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

function todayYMD() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysToIso(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function normalizeCode(val: any) {
  return String(val ?? "").toUpperCase().trim();
}

function isActiveValue(val: any) {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  if (typeof val === "string") {
    const t = val.trim().toLowerCase();
    if (t === "" || t === "false" || t === "0" || t === "no" || t === "n") return false;
    return true;
  }
  return true;
}

/** Check vendor holidays from admin API for a specific date.
 * Returns true if vendor is blocked on that date (has a holiday covering that date)
 */
async function isVendorHoliday(restroCode: string | number, isoDate: string): Promise<boolean> {
  try {
    const url = `${ADMIN_BASE.replace(/\/$/, "")}/api/restros/${encodeURIComponent(String(restroCode))}/holidays`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return false;
    const json = await res.json().catch(() => null);
    const rows: any[] = json?.rows ?? json?.data ?? (Array.isArray(json) ? json : []);
    if (!Array.isArray(rows) || rows.length === 0) return false;

    const target = Date.parse(isoDate + "T00:00:00");
    if (!Number.isFinite(target)) return false;

    for (const r of rows) {
      // ignore deleted
      const deletedAt = r?.deleted_at ? Date.parse(r.deleted_at) : null;
      if (deletedAt) continue;

      const start = r?.start_at ? Date.parse(r.start_at) : NaN;
      const end = r?.end_at ? Date.parse(r.end_at) : NaN;
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      if (start <= target && target <= end) return true;
    }
    return false;
  } catch (e) {
    console.warn("holiday check failed", e);
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const trainParam = (url.searchParams.get("train") || "").trim();
    const dateParam = (url.searchParams.get("date") || "").trim() || todayYMD();
    const boardingParam = (url.searchParams.get("boarding") || "").trim().toUpperCase();
    const debug = url.searchParams.get("debug") === "1";

    const supa = serviceClient;

    if (!trainParam) {
      return NextResponse.json({ ok: false, error: "missing_train" }, { status: 400 });
    }

    // 1) fetch route rows (prefer numeric exact)
    const q = trainParam;
    const isDigits = /^[0-9]+$/.test(q);
    let routeRows: any[] = [];

    if (isDigits) {
      const num = Number(q);
      const { data: exactData, error: exactErr } = await supa
        .from("TrainRoute")
        .select(
          "trainId, trainNumber, trainName, stationFrom, stationTo, runningDays, StnNumber, StationCode, StationName, Arrives, Departs, Stoptime, Distance, Platform, Route, Day",
        )
        .eq("trainNumber", num)
        .order("StnNumber", { ascending: true });

      if (!exactErr && Array.isArray(exactData) && exactData.length) {
        routeRows = exactData as any[];
      }
    }

    if (!routeRows.length) {
      const ilikeQ = `%${q.trim()}%`;
      try {
        const { data: partialData, error: partialErr } = await supa
          .from("TrainRoute")
          .select(
            "trainId, trainNumber, trainName, stationFrom, stationTo, runningDays, StnNumber, StationCode, StationName, Arrives, Departs, Stoptime, Distance, Platform, Route, Day",
          )
          .or(`trainName.ilike.${ilikeQ},trainNumber_text.ilike.${ilikeQ}`)
          .order("StnNumber", { ascending: true })
          .limit(500);
        if (!partialErr && Array.isArray(partialData) && partialData.length) {
          routeRows = partialData as any[];
        }
      } catch (e) {
        console.warn("partial route fetch failed", e);
      }
    }

    if (!routeRows.length) {
      return NextResponse.json({ ok: false, error: "train_not_found" }, { status: 404 });
    }

    // compute arrivalDate per row (based on Day)
    // boarding day base: if boardingParam is provided, find that row's Day as boarding base; else use first row Day or 1
    let boardingDayValue: number | null = null;
    if (boardingParam) {
      const b = routeRows.find((r) => normalizeCode(r.StationCode) === normalizeCode(boardingParam));
      if (b && typeof b.Day !== "undefined" && b.Day !== null) {
        boardingDayValue = Number(b.Day);
      }
    }
    const baseDay = typeof routeRows[0]?.Day === "number" ? Number(routeRows[0].Day) : 1;

    const rowsWithArrival = routeRows.map((r) => {
      let arrivalDate = dateParam;
      if (typeof r.Day === "number" && boardingDayValue != null) {
        const diff = Number(r.Day) - Number(boardingDayValue);
        arrivalDate = addDaysToIso(dateParam, diff);
      } else if (typeof r.Day === "number") {
        const diff = Number(r.Day) - baseDay;
        arrivalDate = addDaysToIso(dateParam, diff);
      }
      return { ...r, arrivalDate };
    });

    // prepare station code list
    const stationCodes = Array.from(new Set(rowsWithArrival.map((r) => normalizeCode(r.StationCode)).filter(Boolean)));

    // fetch restros for those stationCodes
    let restrosByStation: Record<string, any[]> = {};

    if (stationCodes.length) {
      try {
        // try normalized column if exists
        const colCandidates = ["stationcode_norm", "StationCode", "station_code", "stationcode"];
        let fetched: any[] | null = null;

        // first attempt: if the normalized column exists (common in your DB)
        try {
          const { data: rr1, error: rr1err } = await supa
            .from("RestroMaster")
            .select('RestroCode, RestroName, StationCode, StationName, "0penTime", "ClosedTime", WeeklyOff, MinimumOrdermValue, CutOffTime, IsActive, RestroDisplayPhoto')
            .in("stationcode_norm", stationCodes)
            .limit(5000);

          if (!rr1err && Array.isArray(rr1) && rr1.length) {
            fetched = rr1;
          }
        } catch {
          // ignore
        }

        // second attempt: StationCode column exact match
        if (!fetched) {
          try {
            const { data: rr2, error: rr2err } = await supa
              .from("RestroMaster")
              .select('RestroCode, RestroName, StationCode, StationName, "0penTime", "ClosedTime", WeeklyOff, MinimumOrdermValue, CutOffTime, IsActive, RestroDisplayPhoto')
              .in("StationCode", stationCodes)
              .limit(5000);
            if (!rr2err && Array.isArray(rr2) && rr2.length) {
              fetched = rr2;
            }
          } catch {
            // ignore
          }
        }

        // fallback: ilike by StationCode or StationName
        if (!fetched) {
          const orParts = stationCodes.map((c) => `StationCode.ilike.%${c}%`);
          const orCond = orParts.join(",");
          const { data: rr3, error: rr3err } = await supa
            .from("RestroMaster")
            .select('RestroCode, RestroName, StationCode, StationName, "0penTime", "ClosedTime", WeeklyOff, MinimumOrdermValue, CutOffTime, IsActive, RestroDisplayPhoto')
            .or(orCond)
            .limit(5000);
          if (!rr3err && Array.isArray(rr3) && rr3.length) {
            fetched = rr3;
          }
        }

        // final fallback: fetch many and filter client-side
        if (!fetched) {
          const { data: allR, error: allErr } = await supa
            .from("RestroMaster")
            .select('RestroCode, RestroName, StationCode, StationName, "0penTime", "ClosedTime", WeeklyOff, MinimumOrdermValue, CutOffTime, IsActive, RestroDisplayPhoto')
            .limit(10000);
          if (!allErr && Array.isArray(allR)) fetched = allR;
        }

        if (fetched && Array.isArray(fetched)) {
          for (const r of fetched) {
            const sc = normalizeCode(r.StationCode);
            restrosByStation[sc] = restrosByStation[sc] || [];
            restrosByStation[sc].push(r);
          }
        }
      } catch (e) {
        console.error("restromaster fetch failed", e);
      }
    }

    // For each route row, attach restros that are active on the row.arrivalDate
    const stationsOut = [];
    for (const r of rowsWithArrival) {
      const sc = normalizeCode(r.StationCode);
      const arrivalDate = r.arrivalDate; // ISO yyyy-mm-dd for that station
      const rawRestros = restrosByStation[sc] || [];

      const restrosAvailable: any[] = [];
      for (const vendor of rawRestros) {
        try {
          const isActiveField = vendor.IsActive ?? vendor.isActive;
          if (!isActiveValue(isActiveField)) continue;

          // holiday check: if vendor has holiday covering arrivalDate, skip
          const holidayBlocked = await isVendorHoliday(vendor.RestroCode ?? vendor.restroCode ?? vendor.id, arrivalDate);
          if (holidayBlocked) continue;

          // vendor considered available on arrivalDate
          restrosAvailable.push({
            RestroCode: vendor.RestroCode ?? vendor.restroCode ?? vendor.id,
            RestroName: vendor.RestroName ?? vendor.restroName ?? vendor.name,
            isActive: true,
            OpenTime: vendor["0penTime"] ?? vendor.OpenTime ?? vendor.openTime ?? null,
            ClosedTime: vendor.ClosedTime ?? vendor.closeTime ?? vendor.ClosedTime ?? null,
            MinimumOrdermValue: vendor.MinimumOrdermValue ?? vendor.minOrder ?? vendor.MinimumOrdermValue ?? null,
            RestroDisplayPhoto: vendor.RestroDisplayPhoto ?? vendor.display_photo ?? vendor.photo ?? null,
            raw: vendor,
            source: "admin",
          });
        } catch (e) {
          console.warn("vendor check failed", e);
          continue;
        }
      }

      const blockedReasons = [];
      if (!restrosAvailable.length) blockedReasons.push("No vendor mapped at this station for arrivalDate");

      stationsOut.push({
        StnNumber: r.StnNumber,
        StationCode: sc,
        StationName: r.StationName ?? r.stationName ?? sc,
        Day: typeof r.Day === "number" ? Number(r.Day) : null,
        Arrives: r.Arrives ?? null,
        Departs: r.Departs ?? null,
        arrivalTime: (r.Arrives || r.Departs || "").slice(0, 5) || null,
        arrivalDate,
        Platform: r.Platform ?? null,
        Distance: r.Distance ?? null,
        runningDays: r.runningDays ?? null,
        restros: restrosAvailable,
        restroCount: restrosAvailable.length,
        blockedReasons,
        raw: r,
      });
    }

    // If a stationParam was passed, return only that station row (and keep vendors)
    const stationParam = (url.searchParams.get("station") || "").trim();
    if (stationParam) {
      const stationCode = normalizeCode(stationParam);
      const stationRows = stationsOut.filter((s: any) => (s.StationCode || "").toUpperCase() === stationCode);
      if (!stationRows.length) {
        return NextResponse.json({ ok: false, error: "station_not_on_route", meta: { train: trainParam, stationCode } }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        train: { trainNumber: trainParam, trainName: routeRows[0]?.trainName ?? null },
        rows: stationRows,
        meta: { stationCode, date: dateParam, boarding: boardingParam || null },
        debug: debug ? { stationCodes, restrosByStationKeys: Object.keys(restrosByStation) } : undefined,
      });
    }

    // otherwise return all stations (with attached restros only if active on that station's arrivalDate)
    return NextResponse.json({
      ok: true,
      train: { trainNumber: trainParam, trainName: routeRows[0]?.trainName ?? null },
      rows: stationsOut,
      meta: { date: dateParam, boarding: boardingParam || null },
      debug: debug ? { stationCodes, restrosByStationKeys: Object.keys(restrosByStation) } : undefined,
    });
  } catch (e) {
    console.error("train-restros GET server_error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
