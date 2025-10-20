// app/api/stations/[code]/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function makeSupabaseClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    // Do NOT throw here — let handler decide and return a 500 JSON response.
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
}

export async function GET(req: Request, { params }: { params: { code: string } }) {
  try {
    const supabase = makeSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Server configuration error: SUPABASE_URL or SUPABASE_SERVICE_ROLE not set" },
        { status: 500 }
      );
    }

    const code = (params.code || "").toString().toUpperCase();
    if (!code) return NextResponse.json({ error: "station code required" }, { status: 400 });

    // 1) station
    const { data: station, error: stErr } = await supabase
      .from("Stations")
      .select("StationCode, StationName, State, District, storage_image_path")
      .eq("StationCode", code)
      .maybeSingle();

    if (stErr) return NextResponse.json({ error: stErr.message }, { status: 500 });
    if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

    // 2) restros for station that are active
    const { data: restros, error: rErr } = await supabase
      .from("restros")
      .select("code, name, rating, type, cuisines, storage_image_path")
      .eq("station_code", code)
      .eq("is_active", true);

    if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

    // 3) for each restro fetch latest fssai and filter
    const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const filtered: any[] = [];

    for (const r of restros || []) {
      const { data: rf, error: rfErr } = await supabase
        .from("restro_fssai")
        .select("fssai_number, expiry_date, is_active")
        .eq("restro_code", r.code)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rfErr) {
        console.warn("fssai fetch error for", r.code, rfErr.message);
        continue;
      }

      const hasFssaiActive = rf && rf.is_active && rf.expiry_date && rf.expiry_date > now;
      if (hasFssaiActive) filtered.push({ ...r, fssai: rf });
    }

    // 4) build public URLs for images (adjust bucket name)
    const makeUrl = (path?: string | null) => {
      if (!path) return null;
      try {
        const { data } = supabase.storage.from("public").getPublicUrl(path);
        return data?.publicUrl || null;
      } catch {
        return null;
      }
    };

    const stationWithUrl = { ...station, image_url: makeUrl(station.storage_image_path) };
    const restrosWithUrl = filtered.map((r) => ({ ...r, image_url: makeUrl(r.storage_image_path) }));

    return NextResponse.json({ station: stationWithUrl, restaurants: restrosWithUrl });
  } catch (err) {
    console.error("stations/[code] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
