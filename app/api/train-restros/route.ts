// app/api/train-restros/route.ts  (DEBUG VERSION - remove after debugging)
import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

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
    if (!r.ok) return { ok: false, status: r.status, text: await r.text().catch(()=>null) };
    return { ok: true, json: await r.json().catch(()=>null), status: r.status };
  } catch (e:any) {
    return { ok: false, error: String(e) };
  }
}
function mapAdminRestroToCommon(adminR: any) {
  return {
    RestroCode: adminR.RestroCode ?? adminR.id ?? adminR.code ?? null,
    RestroName: adminR.RestroName ?? adminR.name ?? adminR.restro_name ?? null,
    isActive: adminR.IsActive ?? adminR.is_active ?? adminR.active ?? true,
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

  // DEBUG info accumulator
  const debug: any = { params: { train, date, boarding }, steps: [] };

  try {
    // 1) read stops (tolerant)
    const { data: stopsRaw, error: stopsErr } = await serviceClient
      .from("train_stops")
      .select("station_code,station_name,state,stop_sequence,arrival_time")
      .eq("train_number", train)
      .order("stop_sequence", { ascending: true });

    debug.steps.push({ step: "fetched_train_stops", stopsRawLength: Array.isArray(stopsRaw) ? stopsRaw.length : null, stopsErr: String(stopsErr || "") });

    const stops: any[] = Array.isArray(stopsRaw) ? stopsRaw : [];

    if (!stops.length) {
      return NextResponse.json({ ok: true, train: { train_number: train, train_name: "" }, stations: [], debug }, { status: 200 });
    }

    const boardingIndex = stops.findIndex((s: any) =>
      String((s.station_code ?? s.StationCode ?? s.station ?? "")).toUpperCase() === boarding.toUpperCase()
    );
    debug.steps.push({ step: "found_boarding_index", boardingIndex });

    const routeFromBoarding = boardingIndex >= 0 ? stops.slice(boardingIndex) : stops;
    const candidateStops = routeFromBoarding.slice(0, 12);
    const stationCodes = candidateStops.map((s: any) => normalizeCode(s.station_code ?? s.StationCode ?? s.station ?? "")).filter(Boolean);
    debug.steps.push({ step: "candidate_station_codes", stationCodes });

    // 2) try RestroMaster fast path
    let restroRows: any[] = [];
    try {
      const { data, error } = await serviceClient.from("RestroMaster").select("*").in("StationCode", stationCodes);
      debug.steps.push({ step: "restromaster_in_query", rows: Array.isArray(data) ? data.length : null, error: String(error || "") });
      if (Array.isArray(data)) restroRows = data;
    } catch (e:any) {
      debug.steps.push({ step: "restromaster_in_query_error", error: String(e) });
    }

    // fallback fetch all & filter if none
    if (!restroRows.length) {
      try {
        const { data: allRestros, error } = await serviceClient.from("RestroMaster").select("*").limit(5000);
        debug.steps.push({ step: "restromaster_all_fetch", rows: Array.isArray(allRestros) ? allRestros.length : null, error: String(error || "") });
        if (Array.isArray(allRestros)) {
          const lowerCodes = stationCodes.map((c) => c.toLowerCase());
          restroRows = (allRestros || []).filter((r: any) => {
            const rl = normalizeToLower(r);
            const cand = rl.stationcode ?? rl.station_code ?? rl.station ?? rl.stationid ?? rl.stationname ?? null;
            if (!cand) return false;
            return lowerCodes.includes(String(cand).toLowerCase());
          });
        }
      } catch (e:any) {
        debug.steps.push({ step: "restromaster_all_fetch_error", error: String(e) });
      }
    }

    debug.steps.push({ step: "restromaster_group_count", restroRowsCount: restroRows.length });

    // group
    const grouped: Record<string, any[]> = {};
    for (const r of restroRows) {
      const sc = normalizeCode(r.StationCode ?? r.stationcode ?? r.Station ?? r.station ?? null);
      if (!sc) continue;
      (grouped[sc] = grouped[sc] || []).push(r);
    }
    debug.steps.push({ step: "grouped_keys", keys: Object.keys(grouped).slice(0, 20) });

    // prepare final stations
    const finalStations: any[] = [];

    for (const s of candidateStops) {
      const sc = normalizeCode(s.station_code ?? s.StationCode ?? s.station ?? "");
      const stationName = s.station_name ?? s.StationName ?? s.station ?? sc;
      let vendors: any[] = [];

      if (grouped[sc] && Array.isArray(grouped[sc])) {
        vendors = grouped[sc].filter((r: any) => {
          const isActive = r.IsActive ?? r.isActive ?? r.active;
          return isActive === undefined ? true : isActiveValue(isActive);
        }).map((r: any) => ({ ...r, source: "restromaster" }));
      }

      if (!vendors.length) {
        // ADMIN fallback
        const adminUrl = `${ADMIN_BASE.replace(/\/$/, "")}/api/stations/${encodeURIComponent(sc)}`;
        const adminResp = await fetchJson(adminUrl);
        debug.steps.push({ step: "admin_fetch", station: sc, adminRespStatus: adminResp?.status ?? null, adminRespOk: adminResp?.ok ?? false });
        const adminRows = adminResp?.json?.restaurants ?? adminResp?.json?.data ?? adminResp?.json?.rows ?? adminResp?.json ?? null;
        if (Array.isArray(adminRows) && adminRows.length) {
          vendors = adminRows.map((ar:any) => ({ ...mapAdminRestroToCommon(ar), source: "admin" }));
          vendors = vendors.filter((v:any) => v.isActive !== false);
          debug.steps.push({ step: "admin_used_for", station: sc, adminRows: adminRows.length });
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

    const { data: trainMeta, error: trainErr } = await serviceClient.from("trains").select("train_number,train_name").eq("train_number", train).single();
    debug.steps.push({ step: "train_meta", trainMeta: trainMeta ?? null, trainErr: String(trainErr || "") });

    return NextResponse.json({
      ok: true,
      train: trainMeta || { train_number: train, train_name: "" },
      stations: finalStations,
      debug
    }, { status: 200 });
  } catch (err: any) {
    // DEBUG: return error details so you can paste here
    return NextResponse.json({
      ok: false,
      error: "server_error",
      message: String(err?.message ?? err),
      stack: String(err?.stack ?? ""),
    }, { status: 500 });
  }
}
