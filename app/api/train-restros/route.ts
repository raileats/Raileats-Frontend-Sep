// app/api/train-restros/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/**
 * Robust endpoint returning only stations (from boarding -> nextN) that have >=1 active restro
 * Works with RestroMaster even if column names vary a bit.
 */

function normalizeToLower(obj: Record<string, any>) {
  const lower: Record<string, any> = {};
  for (const k of Object.keys(obj)) {
    lower[k.toLowerCase()] = obj[k];
  }
  return lower;
}

function vendorIsActiveOnDate(vendorRow: Record<string, any>, dateStr: string) {
  const v = normalizeToLower(vendorRow);
  const activeCandidates = ["active", "is_active", "status", "online"];
  let activeVal: any = undefined;
  for (const c of activeCandidates) {
    if (c in v) {
      activeVal = v[c];
      break;
    }
  }
  if (activeVal !== undefined) {
    const falsy = [0, "0", false, "false", "False", "FALSE", null];
    if (falsy.includes(activeVal)) return false;
  }

  const sdCandidates = ["startdate", "start_date", "start"];
  const edCandidates = ["enddate", "end_date", "end"];

  let sd: string | null = null;
  let ed: string | null = null;

  for (const c of sdCandidates) if (c in v && v[c]) { sd = String(v[c]); break; }
  for (const c of edCandidates) if (c in v && v[c]) { ed = String(v[c]); break; }

  if (!sd && !ed) {
    if (activeVal === undefined) return true;
    return !(activeVal === 0 || activeVal === "0" || activeVal === false);
  }

  function toDate(s: string) {
    if (!s) return null;
    const t = s.trim().split(" ")[0];
    const d = new Date(t.replace(/-/g, "/"));
    if (isNaN(d.getTime())) return null;
    return d;
  }

  const target = toDate(dateStr);
  const start = sd ? toDate(sd) : null;
  const end = ed ? toDate(ed) : null;

  if (!target) return false;
  if (start && target < start) return false;
  if (end && target > end) return false;
  return true;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const train = url.searchParams.get("train"); // trainNumber
  const date = url.searchParams.get("date");   // YYYY-MM-DD
  const boarding = url.searchParams.get("boarding"); // station code

  if (!train || !date || !boarding) {
    return NextResponse.json({ error: "Missing params: train, date or boarding" }, { status: 400 });
  }

  try {
    // 1) fetch route stops for this train ordered by stop_sequence
    const { data: stops, error: stopsErr } = await serviceClient
      .from("train_stops")
      .select("station_code,station_name,state,stop_sequence,arrival_time")
      .eq("train_number", train)
      .order("stop_sequence", { ascending: true });

    if (stopsErr) throw stopsErr;
    if (!stops || stops.length === 0) {
      return NextResponse.json({ train: { train_number: train, train_name: "" }, stations: [] });
    }

    // find boarding index
    const boardingIndex = stops.findIndex((s: any) => {
      const sc = (s.station_code || s.StationCode || s.station || "").toString();
      return sc.toUpperCase() === boarding.toUpperCase();
    });
    const routeFromBoarding = boardingIndex >= 0 ? stops.slice(boardingIndex) : stops;

    // limit to next N stops
    const nextN = 12;
    const candidateStops = routeFromBoarding.slice(0, nextN);
    const stationCodes = candidateStops
      .map((s: any) => (s.station_code || s.StationCode || s.station || "").toString())
      .filter(Boolean);

    if (stationCodes.length === 0) {
      return NextResponse.json({ train: { train_number: train, train_name: "" }, stations: [] });
    }

    // 2) attempt to fetch restros for these station codes using a common column name
    // IMPORTANT: .in(field, values) accepts two args in this supabase version
    let restroRows: any[] = [];
    try {
      // try the common column name "stationcode" first
      const { data: restros, error: restrosErr } = await serviceClient
        .from("RestroMaster")
        .select("*")
        .in("stationcode", stationCodes);

      if (restrosErr) {
        // if server returns error (likely column doesn't exist), fallback to broad select below
        throw restrosErr;
      }
      restroRows = restros || [];
    } catch (_e) {
      // fallback: select all and filter client-side by multiple possible station columns
      const { data: allRestros, error: allErr } = await serviceClient.from("RestroMaster").select("*");
      if (allErr) throw allErr;
      const lowerCodes = stationCodes.map(s => s.toLowerCase());
      restroRows = (allRestros || []).filter((r: any) => {
        const rl = normalizeToLower(r);
        const possibleStationFields = ["stationcode","station_code","station","station_id","stationid","stationname"];
        for (const f of possibleStationFields) {
          if (f in rl && rl[f] !== undefined && rl[f] !== null) {
            if (lowerCodes.includes(String(rl[f]).toLowerCase())) return true;
          }
        }
        return false;
      });
    }

    // 3) filter restros by active rules (date and active flag). Group by station_code
    const grouped: Record<string, any[]> = {};
    for (const r of restroRows) {
      const rlow = normalizeToLower(r);
      const stationCandidates = ["stationcode","station_code","station","stationid","stationname"];
      let scVal = "";
      for (const c of stationCandidates) {
        if (c in rlow && rlow[c] !== undefined && rlow[c] !== null) {
          scVal = String(rlow[c]).toUpperCase();
          break;
        }
      }
      if (!scVal) continue;

      const active = vendorIsActiveOnDate(r, date);
      if (!active) continue;

      if (!grouped[scVal]) grouped[scVal] = [];
      grouped[scVal].push({
        id: rlow.id ?? rlow.restroid ?? rlow.resto_id ?? null,
        name: rlow.name ?? rlow.restroname ?? rlow.restroname ?? rlow.restro ?? null,
        short_description: rlow.shortdescription ?? rlow.description ?? rlow.desc ?? null,
        logo_url: rlow.logo ?? rlow.logo_url ?? rlow.image ?? null,
        menu_link: rlow.menu_link ?? rlow.menu ?? rlow.menuurl ?? null,
        raw: r
      });
    }

    // 4) prepare final stations array (only stations with >=1 restro)
    const stationsWithVendors = candidateStops
      .map((s: any) => {
        const sc = (s.station_code || s.StationCode || s.station || "").toString().toUpperCase();
        return {
          station_code: sc,
          station_name: s.station_name || s.station || s.StationName || "",
          state: s.state || s.State || null,
          arrival_time: s.arrival_time || s.time || null,
          stop_sequence: s.stop_sequence ?? null,
          vendors: grouped[sc] || []
        };
      })
      .filter((s: any) => s.vendors && s.vendors.length > 0);

    // 5) fetch train meta (best-effort)
    const { data: trainMeta } = await serviceClient
      .from("trains")
      .select("train_number,train_name")
      .eq("train_number", train)
      .single();

    return NextResponse.json({
      train: trainMeta || { train_number: train, train_name: "" },
      stations: stationsWithVendors
    });
  } catch (err) {
    console.error("train-restros error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
