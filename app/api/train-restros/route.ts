// app/api/train-restros/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/**
 * train-restros endpoint with admin API fallback for missing RestroMaster rows.
 * Build-safe: tolerant property access, avoids TypeScript property-name issues.
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
  const train = url.searchParams.get("train");
  const date = url.searchParams.get("date");
  const boarding = url.searchParams.get("boarding");

  if (!train || !date || !boarding) {
    return NextResponse.json({ ok: false, error: "missing params: train/date/boarding" }, { status: 400 });
  }

  try {
    // 1) fetch train stops (tolerant typing)
    const { data: stopsRaw, error: stopsErr } = await serviceClient
      .from("train_stops")
      .select("station_code,station_name,state,stop_sequence,arrival_time")
      .eq("train_number", train)
      .order("stop_sequence", { ascending: true });

    if (stopsErr) throw stopsErr;
    const stops: any[] = Array.isArray(stopsRaw) ? stopsRaw : [];

    if (!stops.length) {
      return NextResponse.json({ ok: true, train: { train_number: train, train_name: "" }, stations: [] });
    }

    // find boarding index (use station_code primarily)
    const boardingIndex = stops.findIndex((s: any) =>
      String((s.station_code ?? s.station ?? s.StationCode ?? "")).toUpperCase() === boarding.toUpperCase()
    );

    const routeFromBoarding = boardingIndex >= 0 ? stops.slice(boardingIndex) : stops;
    const nextN = 12;
    const candidateStops = routeFromBoarding.slice(0, nextN);
    const stationCodes = candidateStops
      .map((s: any) => normalizeCode(s.station_code ?? s.StationCode ?? s.station ?? ""))
      .filter(Boolean);

    // 2) attempt to fetch RestroMaster rows for these station codes
    let restroRows: any[] = [];
    try {
      const { data, error } = await serviceClient.from("RestroMaster").select("*").in("StationCode", stationCodes);
      if (!error && Array.isArray(data) && data.length) restroRows = data;
    } catch {
      // ignore and proceed to fallback
    }

    // fallback: fetch many RestroMaster rows and filter client-side
    if (!restroRows.length) {
      const { data: allRestros, error } = await serviceClient.from("RestroMaster").select("*").limit(5000);
      if (error) {
        // if selecting all fails, continue with empty restroRows
        console.warn("RestroMaster fallback fetch error:", error);
      } else if (Array.isArray(allRestros)) {
        const lowerCodes = stationCodes.map((c) => c.toLowerCase());
        restroRows = (allRestros || []).filter((r: any) => {
          const rl = normalizeToLower(r);
          const cand = rl.stationcode ?? rl.station_code ?? rl.station ?? rl.stationid ?? rl.stationname ?? null;
          if (!cand) return false;
          return lowerCodes.includes(String(cand).toLowerCase());
        });
      }
    }

    // group restros by normalized station code
    const grouped: Record<string, any[]> = {};
    for (const r of restroRows) {
      const sc = normalizeCode(r.StationCode ?? r.stationcode ?? r.Station ?? r.station ?? null);
      if (!sc) continue;
      (grouped[sc] = grouped[sc] || []).push(r);
    }

    // 3) For each candidate stop, prepare vendors (RestroMaster first, then ADMIN fallback)
    const finalStations: any[] = [];
    for (const s of candidateStops) {
      const sc = normalizeCode(s.station_code ?? s.StationCode ?? s.station ?? "");
      const stationName = s.station_name ?? s.StationName ?? s.station ?? sc;
      let vendors: any[] = [];

      // use RestroMaster vendors if present (filter active)
      if (grouped[sc] && Array.isArray(grouped[sc])) {
        vendors = grouped[sc].filter((r: any) => {
          const isActive = r.IsActive ?? r.isActive ?? r.active;
          return isActive === undefined ? true : isActiveValue(isActive);
        }).map((r: any) => ({ ...r, source: "restromaster" }));
      }

      // if no vendors from RestroMaster, try admin stations API
      if (!vendors.length) {
        const adminUrl = `${ADMIN_BASE.replace(/\/$/, "")}/api/stations/${encodeURIComponent(sc)}`;
        const adminJson = await fetchJson(adminUrl);
        const adminRows = adminJson?.restaurants ?? adminJson?.data ?? adminJson?.rows ?? adminJson?.list ?? null;
        if (Array.isArray(adminRows) && adminRows.length) {
          vendors = adminRows.map((ar: any) => ({ ...mapAdminRestroToCommon(ar), source: "admin" }));
          vendors = vendors.filter((v: any) => v.isActive !== false);
        }
      }

      if (vendors.length) {
        finalStations.push({
          station_code: sc,
          station_name: stationName,
          arrival_time: s.arrival_time ?? null,
          vendors,
        });
      }
    }

    // 4) train meta best-effort
    const { data: trainMeta } = await serviceClient.from("trains").select("train_number,train_name").eq("train_number", train).single();

    return NextResponse.json({
      ok: true,
      train: trainMeta || { train_number: train, train_name: "" },
      stations: finalStations,
    });
  } catch (err) {
    console.error("train-restros error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
