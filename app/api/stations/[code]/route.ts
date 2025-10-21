// FRONTEND PROJECT
// app/api/stations/[code]/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function makeSupabase() {
  const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
}

// helper to build public url for storage path
function getPublicUrl(supabase: any, path?: string | null) {
  if (!path) return null;
  if (String(path).startsWith("http")) return path;
  try {
    const { data } = supabase.storage.from("public").getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: Request, { params }: { params: { code: string } }) {
  try {
    const supabase = makeSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Server misconfigured: SUPABASE_SERVICE_ROLE missing" }, { status: 500 });
    }

    const code = (params.code || "").toString().trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "station code required" }, { status: 400 });

    // 1) fetch station row (Stations table)
    const { data: stationRec, error: sErr } = await supabase
      .from("Stations")
      .select("StationCode,StationName,State,District,StationImage,storage_image_path")
      .eq("StationCode", code)
      .maybeSingle();

    if (sErr) {
      console.error("stations fetch error:", sErr);
      return NextResponse.json({ error: sErr.message }, { status: 500 });
    }
    if (!stationRec) return NextResponse.json({ error: "Station not found" }, { status: 404 });

    const stationImagePath = stationRec.storage_image_path ?? stationRec.StationImage ?? null;
    const station = {
      StationCode: stationRec.StationCode,
      StationName: stationRec.StationName,
      State: stationRec.State,
      District: stationRec.District,
      image_url: getPublicUrl(supabase, stationImagePath),
    };

    // 2) fetch restaurants from RestroMaster where StationCode = code and RaileatsStatus = 1
    const { data: restroRows, error: rErr } = await supabase
      .from("RestroMaster")
      .select("RestroCode,RestroName,RestroRating,RestroDisplayPhoto,MinimumOrdermValue,StationCode,RaileatsStatus,FSSAIStatus")
      .eq("StationCode", code)
      .eq("RaileatsStatus", 1);

    if (rErr) {
      console.warn("RestroMaster fetch error:", rErr.message);
      // return station but no restaurants
      return NextResponse.json({ station, restaurants: [] });
    }

    // 3) filter by FSSAIStatus (accept 'Active', 1, '1', true)
    const restaurants: any[] = [];
    for (const r of (restroRows ?? [])) {
      let fssaiOk = false;
      const v = r.FSSAIStatus;
      if (typeof v !== "undefined" && v !== null) {
        const sv = String(v).toLowerCase();
        if (sv === "active" || sv === "1" || sv === "true") fssaiOk = true;
      } else {
        // if row doesn't contain FSSAIStatus, treat as NOT OK (safer)
        fssaiOk = false;
      }
      if (!fssaiOk) continue;

      const imageUrl = getPublicUrl(supabase, r.RestroDisplayPhoto);
      restaurants.push({
        code: r.RestroCode,
        name: r.RestroName,
        rating: r.RestroRating ?? null,
        min_order: r.MinimumOrdermValue ?? null,
        image_url: imageUrl,
      });
    }

    return NextResponse.json({ station, restaurants });
  } catch (err: any) {
    console.error("stations/[code] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
