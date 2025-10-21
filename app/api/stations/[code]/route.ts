// app/api/stations/[code]/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function makeSupabaseClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return null;
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

    // NOTE: select only columns that definitely exist in your Stations table
    const { data: station, error: stErr } = await supabase
      .from("Stations")
      .select("StationCode, StationName, State, District")
      .eq("StationCode", code)
      .maybeSingle();

    if (stErr) return NextResponse.json({ error: stErr.message }, { status: 500 });
    if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

    // get restaurants (select columns you actually have)
    const { data: restros, error: rErr } = await supabase
      .from("restros")
      .select("code, name, rating, type, cuisines")
      .eq("station_code", code)
      .eq("is_active", true);

    if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

    // filter by latest FSSAI (if table exists)
    const now = new Date().toISOString().slice(0, 10);
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

    // We did not request any image path column; set image_url null for now
    const stationWithUrl = { ...station, image_url: null };
    const restrosWithUrl = (filtered || []).map((r) => ({ ...r, image_url: null }));

    return NextResponse.json({ station: stationWithUrl, restaurants: restrosWithUrl });
  } catch (err) {
    console.error("stations/[code] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
