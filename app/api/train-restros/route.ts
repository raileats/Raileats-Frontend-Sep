// app/api/train-restros/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/**
 * train-restros endpoint (production)
 * - Uses TrainRoute to read stops (ordered by StnNumber)
 * - Prefers RestroMaster rows for stations
 * - Falls back to ADMIN stations API when RestroMaster has no rows for a station
 */

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

function normalizeToLower(obj: Record<string, any>) {
  const lower: Record<string, any> = {};
  for (const k of Object.keys(obj)) lower[k.toLowerCase()] = obj[k];
  return lower;
}
function normalizeCode(val: any) {
  return String(val ?? "").toUpperCase().trim();
}
function isActiveValue(val: any) {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  if (typeof val === "string") {
    const t = val.trim().toLowerCase();
    if (["0", "false", "no", "n", ""].includes(t)) return false;
    return true;
  }
  return true;
}
async function fetchJson(url: string) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch {
    return null;
  }
}
function mapAdminRestroToCommon(adminR: any) {
  return {
    RestroCode: adminR.RestroCode ?? adminR.id ?? adminR.code ?? null,
    RestroName: adminR.RestroName ?? adminR.name ?? adminR.restro_name ?? null,
    isActive: isActiveValue(adminR.IsActive ?? adminR.is_active ?? adminR.active),
    OpenTime: adminR.OpenTime ?? adminR.open_time ?? adminR.openTime ?? null,
    ClosedTime: adminR.ClosedTime ?? adminR.closed_time ?? adminR.closeTime ?? null,
    MinimumOrdermValue: adminR.MinimumOrdermValue ?? adminR.minOrder ?? adminR.minimum_order ?? null,
    raw: adminR,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const trainParam = (url.searchParams.get("train") || "").trim();
  const date = (url.searchParams.get("date") || "").trim();
  const boarding = (url.searchParams.get("boarding") || "").trim();

  if (!trainParam || !date || !boarding) {
    return NextResponse.json({ ok: false, error: "missing params: train/date/boarding" }, { status: 400 });
  }

  try {
    // 1) fetch train stops from TrainRoute (order by StnNumber)
    // trainParam may be numeric string — try matching trainNumber first
    const q = trainParam;
    const isDigits = /^[0-9]+$/.test(q);
    let stopsRows: any[] = [];

    if (isDigits) {
      const { data: exactData, error: exactErr } = await serviceClient
        .from("TrainRoute")
        .select("StnNumber,StationCode,StationName,Arrives,Departs,Day,Platform,Distance,trainNumber,trainName,runningDays")
        .eq("trainNumber", Number(q))
        .order("StnNumber", { ascending: true })
        .limit(1000);

      if (!exactErr && Array.isArray(exactData) && exactData.length) stopsRows = exactData;
    }

    // fallback: try matching trainName/trainNumber_text ilike if no numeric match
    if (!stopsRows.length) {
      const ilikeQ = `%${q}%`;
      try {
        const { data: partialData } = await serviceClient
          .from("TrainRoute")
          .select("StnNumber,StationCode,StationName,Arrives,Departs,Day,Platform,Distance,trainNumber,trainName,runningDays")
          .or(`trainName.ilike.${ilikeQ},trainNumber_text.ilike.${ilikeQ}`)
          .order("StnNumber", { ascending: true })
          .limit(1000);
        if (Array.isArray(partialData) && partialData.length) stopsRows = partialData;
      } catch {
        // ignore
      }
    }

    if (!stopsRows.length) {
      return NextResponse.json({ ok: true, train: { trainNumber: trainParam, trainName: null }, stations: [] });
    }

    // build candidate stops from boarding onward (limit N)
    const normBoard = normalizeCode(boarding);
    const startIdx = stopsRows.findIndex((r: any) => normalizeCode(r.StationCode ?? r.stationcode ?? r.Station ?? r.station) === normBoard);
    const sliceStart = startIdx >= 0 ? startIdx : 0;
    const CAND_LIMIT = 12;
    const candidateStops = stopsRows.slice(sliceStart, sliceStart + CAND_LIMIT);

    const stationCodes = candidateStops.map((s: any) => normalizeCode(s.StationCode ?? s.stationcode ?? s.Station ?? s.station)).filter(Boolean);

    // 2) fast path: RestroMaster .in("StationCode", stationCodes)
    let restroRows: any[] = [];
    if (stationCodes.length) {
      try {
        const { data, error } = await serviceClient.from("RestroMaster").select(
          "RestroCode,RestroName,StationCode,StationName,0penTime,ClosedTime,WeeklyOff,MinimumOrdermValue,CutOffTime,IsActive"
        ).in("StationCode", stationCodes).limit(5000);
        if (!error && Array.isArray(data) && data.length) restroRows = data;
      } catch {
        // ignore and fallback below
      }
    }

    // fallback: fetch many and filter client-side if restroRows is empty
    if (!restroRows.length) {
      try {
        const { data: allRestros } = await serviceClient.from("RestroMaster").select(
          "RestroCode,RestroName,StationCode,StationName,0penTime,ClosedTime,WeeklyOff,MinimumOrdermValue,CutOffTime,IsActive"
        ).limit(5000);
        if (Array.isArray(allRestros)) {
          const lowerCodes = stationCodes.map((c) => c.toLowerCase());
          restroRows = (allRestros || []).filter((r: any) => {
            const rl = normalizeToLower(r);
            const cand = rl.stationcode ?? rl.station_code ?? rl.station ?? rl.stationid ?? rl.stationname ?? null;
            if (!cand) return false;
            return lowerCodes.includes(String(cand).toLowerCase());
          });
        }
      } catch {
        // ignore
      }
    }

    // group RestroMaster rows by normalized StationCode
    const grouped: Record<string, any[]> = {};
    for (const r of restroRows) {
      const sc = normalizeCode(r.StationCode ?? r.stationcode ?? r.Station ?? r.station ?? null);
      if (!sc) continue;
      (grouped[sc] = grouped[sc] || []).push(r);
    }

    // 3) assemble final stations: prefer restromaster vendors, fallback to admin stations API
    const finalStations: any[] = [];
    for (const s of candidateStops) {
      const sc = normalizeCode(s.StationCode ?? s.stationcode ?? s.Station ?? s.station ?? "");
      if (!sc) continue;
      const stationName = s.StationName ?? s.stationName ?? s.station_name ?? s.station ?? sc;
      let vendors: any[] = [];

      // use RestroMaster vendors first
      if (grouped[sc] && Array.isArray(grouped[sc])) {
        vendors = grouped[sc].filter((r: any) => isActiveValue(r.IsActive ?? r.isActive ?? r.active))
          .map((r: any) => ({
            RestroCode: r.RestroCode ?? r.restroCode ?? r.id ?? null,
            RestroName: r.RestroName ?? r.restroName ?? r.name ?? null,
            isActive: r.IsActive ?? r.isActive ?? true,
            OpenTime: r["0penTime"] ?? r.openTime ?? null,
            ClosedTime: r.ClosedTime ?? r.closeTime ?? null,
            MinimumOrdermValue: r.MinimumOrdermValue ?? r.minOrder ?? null,
            source: "restromaster",
            raw: r,
          }));
      }

      // admin fallback if none
      if (!vendors.length) {
        const adminUrl = `${ADMIN_BASE.replace(/\/$/, "")}/api/stations/${encodeURIComponent(sc)}`;
        const adminJson = await fetchJson(adminUrl);
        const adminRows = adminJson?.restaurants ?? adminJson?.data ?? adminJson?.rows ?? adminJson ?? null;
        if (Array.isArray(adminRows) && adminRows.length) {
          vendors = adminRows.map((ar: any) => ({ ...mapAdminRestroToCommon(ar), source: "admin" })).filter((v: any) => v.isActive !== false);
        }
      }

      if (vendors.length) {
        finalStations.push({
          StationCode: sc,
          StationName: stationName,
          arrival_time: s.Arrives ?? s.Arrival ?? s.arrival_time ?? null,
          Day: typeof s.Day === "number" ? s.Day : (s.Day ? Number(s.Day) : null),
          vendors,
        });
      }
    }

    // 4) train meta best-effort
    const trainName = (stopsRows[0]?.trainName ?? stopsRows[0]?.train_name ?? null) || null;

    return NextResponse.json({
      ok: true,
      train: { trainNumber: trainParam, trainName },
      stations: finalStations,
    });
  } catch (e) {
    console.error("train-restros error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
