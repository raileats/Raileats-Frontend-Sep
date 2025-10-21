// app/api/stations/[code]/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function makeSupabaseClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
}

function pickImagePath(rec: any) {
  if (!rec) return null;
  const cands = ["StationImage", "storage_image_path", "image_path", "StationImagePath", "station_image", "image_url", "photo", "StationPhoto"];
  for (const k of cands) if (rec[k]) return rec[k];
  return null;
}

function pickRestroImagePath(rec: any) {
  if (!rec) return null;
  const cands = ["RestroDisplayPhoto", "storage_image_path", "image_path", "display_photo", "image_url", "photo"];
  for (const k of cands) if (rec[k]) return rec[k];
  return null;
}

async function findRestroTableName(supabase: any) {
  // Try common table names; return first that exists
  const candidates = ["restros", "RestroMaster", "restromaster", "restro_master", "Restro_Master", "RestroMaster_view", "RestroMaster_v"];
  for (const t of candidates) {
    try {
      // attempt a lightweight head request (select 1)
      const { error } = await supabase.from(t).select("1").limit(1);
      if (!error) return t;
    } catch (e) {
      // ignore
    }
  }
  return null;
}

export async function GET(req: Request, { params }: { params: { code: string } }) {
  try {
    const supabase = makeSupabaseClient();
    if (!supabase) return NextResponse.json({ error: "SUPABASE not configured" }, { status: 500 });

    const code = (params.code || "").toString().toUpperCase();
    if (!code) return NextResponse.json({ error: "station code required" }, { status: 400 });

    // 1) station record
    const stationTableCandidates = ["Stations", "stations", "Station", "station"];
    let stationRec: any = null;
    for (const t of stationTableCandidates) {
      try {
        const { data, error } = await supabase.from(t).select("*").eq("StationCode", code).maybeSingle();
        if (!error && data) {
          stationRec = data;
          break;
        }
      } catch (e) {
        // ignore and try next
      }
    }
    if (!stationRec) return NextResponse.json({ error: "Station not found" }, { status: 404 });

    // 2) find restro table name
    const restroTable = await findRestroTableName(supabase);
    if (!restroTable) {
      // No restro table available; return empty restaurants but station ok
      const stationOut = {
        StationCode: stationRec.StationCode,
        StationName: stationRec.StationName,
        State: stationRec.State,
        District: stationRec.District,
        image_url: (pickImagePath(stationRec) ? supabase.storage.from("public").getPublicUrl(pickImagePath(stationRec)).data.publicUrl : null),
      };
      return NextResponse.json({ station: stationOut, restaurants: [] });
    }

    // 3) fetch restros for station
    // Note: field names in RestroMaster may vary: StationCode, station_code, RestroCode etc.
    // We'll select broadly and filter in JS to be safe.
    let restroRows: any[] = [];
    try {
      const { data, error } = await supabase.from(restroTable).select("*").ilike("StationCode", code).limit(500);
      if (!error && Array.isArray(data)) restroRows = data;
      else {
        // try case with station_code column
        const { data: d2, error: e2 } = await supabase.from(restroTable).select("*").ilike("station_code", code).limit(500);
        if (!e2 && Array.isArray(d2)) restroRows = d2;
      }
    } catch (e) {
      // ignore, keep empty
    }

    // 4) filter restros by RaileatsStatus and FSSAIStatus
    // possible field names: RaileatsStatus (1/0), FSSAIStatus (Active/Inactive), FSSAIStatus maybe boolean
    const now = new Date().toISOString().slice(0, 10);
    const restaurants: any[] = [];

    for (const r of restroRows) {
      // detect raileats status
      let raileatsOn = false;
      if ("RaileatsStatus" in r) {
        const v = r.RaileatsStatus;
        raileatsOn = (v === 1 || v === "1" || v === true || v === "true");
      } else if ("raileatsstatus" in r) {
        const v = r.raileatsstatus;
        raileatsOn = (v === 1 || v === "1" || v === true);
      } else if ("IsActive" in r) {
        const v = r.IsActive;
        raileatsOn = (v === 1 || v === "1" || v === true);
      } else if ("is_active" in r) {
        const v = r.is_active;
        raileatsOn = (v === 1 || v === "1" || v === true);
      }

      if (!raileatsOn) continue;

      // detect fssai status
      let fssaiOk = false;
      if ("FSSAIStatus" in r) {
        const v = String(r.FSSAIStatus || "").toLowerCase();
        fssaiOk = (v === "active" || v === "1" || v === "true");
      } else if ("fssai_status" in r) {
        const v = String(r.fssai_status || "").toLowerCase();
        fssaiOk = (v === "active" || v === "1" || v === "true");
      } else {
        // if there is no explicit FSSAIStatus field, allow it (depends on your rules)
        fssaiOk = true;
      }
      if (!fssaiOk) continue;

      // build restaurant object
      const restroCode = r.RestroCode ?? r.restrocode ?? r.code ?? r.code_id ?? r.RestroID ?? r.RestroId ?? r.id;
      const restroImagePath = pickRestroImagePath(r);
      let image_url = null;
      if (restroImagePath) {
        try {
          const { data } = supabase.storage.from("public").getPublicUrl(restroImagePath);
          image_url = data?.publicUrl || null;
        } catch { image_url = null; }
      }

      const cuisines = (() => {
        const c = r.cuisines ?? r.Cuisines ?? r.Cuisine ?? r.RestroCuisines ?? r.CuisinesList;
        if (!c) return [];
        if (Array.isArray(c)) return c;
        return String(c).split(",").map((s: string) => s.trim()).filter(Boolean);
      })();

      restaurants.push({
        code: restroCode,
        name: r.RestroName ?? r.name ?? r.RestroDisplayName ?? r.RestroName ?? r.restro_name ?? "Unknown",
        rating: r.RestroRating ?? r.rating ?? null,
        type: r.RestroType ?? r.type ?? r.RestroType ?? null,
        cuisines,
        min_order: r.MinimumOrdermValue ?? r.MinOrder ?? r.minimum_order ?? null,
        image_url,
      });
    }

    const stationOut = {
      StationCode: stationRec.StationCode,
      StationName: stationRec.StationName,
      State: stationRec.State,
      District: stationRec.District,
      image_url: (pickImagePath(stationRec) ? supabase.storage.from("public").getPublicUrl(pickImagePath(stationRec)).data.publicUrl : null),
    };

    return NextResponse.json({ station: stationOut, restaurants });
  } catch (err) {
    console.error("stations/[code] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
