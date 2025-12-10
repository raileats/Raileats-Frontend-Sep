// app/api/train-restros/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/**
 * This endpoint returns:
 *  - train meta (train_number, train_name)
 *  - stations[] where each station has vendors[] (only stations with >=1 active vendor)
 *
 * It is designed to work with your RestroMaster table even if column names vary slightly.
 * It fetches RestroMaster with select('*') and does runtime checks for common column names:
 *   - station code: station_code | StationCode | Station
 *   - active flag: active | is_active | Status | Online
 *   - start/end dates: start_date | StartDate | startDate, end_date | EndDate | endDate
 *   - vendor id/name/logo/menu: id | RestroID, name | RestroName | Name, logo_url | Logo
 *
 * Adjust `nextN` if you want to show more/less stops.
 */

function normalizeToLower(obj: Record<string, any>) {
  const lower: Record<string, any> = {};
  for (const k of Object.keys(obj)) {
    lower[k.toLowerCase()] = obj[k];
  }
  return lower;
}

function vendorIsActiveOnDate(vendorRow: Record<string, any>, dateStr: string) {
  // dateStr is YYYY-MM-DD
  const v = normalizeToLower(vendorRow);
  // possible active flags:
  const activeCandidates = ["active", "is_active", "status", "online"];
  let activeVal: any = undefined;
  for (const c of activeCandidates) {
    if (c in v) {
      activeVal = v[c];
      break;
    }
  }
  // If activeVal exists and is falsy (0, false, '0', 'false'), treat as inactive
  if (activeVal !== undefined) {
    const falsy = [0, "0", false, "false", "False", "FALSE", null];
    if (falsy.includes(activeVal)) return false;
    // if numeric 1 or trueish, continue to date checks
  }

  // date range checks if present
  const sdCandidates = ["startdate", "start_date", "start"];
  const edCandidates = ["enddate", "end_date", "end"];

  let sd: string | null = null;
  let ed: string | null = null;

  for (const c of sdCandidates) if (c in v && v[c]) { sd = String(v[c]); break; }
  for (const c of edCandidates) if (c in v && v[c]) { ed = String(v[c]); break; }

  // if no date constraints, assume activeVal true-ish or unknown => active
  if (!sd && !ed) {
    // if activeVal defined and truthy => active, else if undefined => assume active
    if (activeVal === undefined) return true;
    return !(activeVal === 0 || activeVal === "0" || activeVal === false);
  }

  // compare dates (normalize)
  function toDate(s: string) {
    // try to parse a few formats; simplest: take YYYY-MM-DD prefix
    if (!s) return null;
    // Remove time if present and spaces
    const t = s.trim().split(" ")[0];
    // If already YYYY-MM-DD or YYYY/MM/DD or DD-MM-YYYY, try Date
    const d = new Date(t.replace(/-/g, "/"));
    if (isNaN(d.getTime())) return null;
    return d;
  }

  const target = toDate(dateStr);
  const start = sd ? toDate(sd) : null;
  const end = ed ? toDate(ed) : null;

  if (!target) return false; // can't check

  if (start && target < start) return false;
  if (end && target > end) return false;

  // passed date checks
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
    const stationCodes = candidateStops.map((s: any) => (s.station_code || s.StationCode || s.station || "").toString()).filter(Boolean);

    if (stationCodes.length === 0) {
      return NextResponse.json({ train: { train_number: train, train_name: "" }, stations: [] });
    }

    // 2) fetch restros from RestroMaster for these station codes
    // Use select('*') so it works with whatever columns exist; we'll filter in JS
    const { data: restros, error: restrosErr } = await serviceClient
      .from("RestroMaster")
      .select("*")
      .in("stationcode", stationCodes, { /* fallback - supabase will error if column doesn't exist */ });

    // If supabase errors because column name differs, fallback to broad select and filter by many possible columns in JS
    let restroRows: any[] = [];
    if (restrosErr) {
      // try broad select and filter client-side
      const { data: allRestros, error: allErr } = await serviceClient.from("RestroMaster").select("*");
      if (allErr) throw allErr;
      // filter by station codes using common column names
      const lowerCodes = stationCodes.map(s=>s.toLowerCase());
      restroRows = (allRestros || []).filter((r: any) => {
        const rl = normalizeToLower(r);
        const possibleStationFields = ["stationcode","station_code","station","station_id","stationcode_text"];
        for (const f of possibleStationFields) {
          if (f in rl && rl[f] && lowerCodes.includes(String(rl[f]).toLowerCase())) return true;
        }
        return false;
      });
    } else {
      restroRows = restros || [];
    }

    // 3) filter restros by active rules (date and active flag). Build map station_code -> restros[]
    const grouped: Record<string, any[]> = {};
    for (const r of restroRows) {
      // try to find the station code value for this restro
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

      // is restro active on requested date?
      const active = vendorIsActiveOnDate(r, date);
      if (!active) continue;

      if (!grouped[scVal]) grouped[scVal] = [];
      grouped[scVal].push({
        // map common fields so client can use them easily
        id: rlow.id ?? rlow.restroid ?? rlow.resto_id ?? rlow.restroid ?? rlow["restro id"] ?? null,
        name: rlow.name ?? rlow.restroname ?? rlow.restroname ?? rlow["restro name"] ?? rlow.restro ?? null,
        short_description: rlow.shortdescription ?? rlow.description ?? rlow.desc ?? rlow.shortdesc ?? null,
        logo_url: rlow.logo ?? rlow.logo_url ?? rlow.image ?? rlow.logourl ?? null,
        menu_link: rlow.menu_link ?? rlow.menu ?? rlow.menuurl ?? null,
        raw: r // full raw row in case frontend needs other fields
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
    const { data: trainMeta, error: trainErr } = await serviceClient
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
