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

function pickImagePathFromRecord(rec: any) {
  if (!rec) return null;
  const candidates = ["storage_image_path", "image_path", "photo", "photo_url", "image_url"];
  for (const c of candidates) if (rec[c]) return rec[c];
  return null;
}

export async function GET(req: Request, { params }: { params: { code: string } }) {
  try {
    const supabase = makeSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Server config missing SUPABASE_URL / SUPABASE_SERVICE_ROLE" }, { status: 500 });
    }

    const code = (params.code || "").toString().toUpperCase();
    if (!code) return NextResponse.json({ error: "station code required" }, { status: 400 });

    // get station record (select all so it's tolerant to different schemas)
    const { data: stationRec, error: stErr } = await supabase
      .from("Stations")
      .select("*")
      .eq("StationCode", code)
      .maybeSingle();

    if (stErr) return NextResponse.json({ error: stErr.message }, { status: 500 });
    if (!stationRec) return NextResponse.json({ error: "Station not found" }, { status: 404 });

    // get restros for that station
    const { data: restros, error: rErr } = await supabase
      .from("restros")
      .select("*")
      .eq("station_code", code)
      .eq("is_active", true);

    if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

    // filter restros with active FSSAI
    const now = new Date().toISOString().slice(0, 10);
    const filtered: any[] = [];
    for (const r of restros || []) {
      const { data: rf } = await supabase
        .from("restro_fssai")
        .select("fssai_number, expiry_date, is_active")
        .eq("restro_code", r.code)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .catch(() => ({ data: null }));
      const hasFssaiActive = rf && rf.is_active && rf.expiry_date && rf.expiry_date > now;
      if (hasFssaiActive) filtered.push({ ...r, fssai: rf });
    }

    // build public URLs for images (public bucket name: "public")
    const makeUrl = (path?: string | null) => {
      if (!path) return null;
      try {
        const { data } = supabase.storage.from("public").getPublicUrl(path);
        return data?.publicUrl || null;
      } catch {
        return null;
      }
    };

    const stationImagePath = pickImagePathFromRecord(stationRec);
    const station = {
      StationCode: stationRec.StationCode,
      StationName: stationRec.StationName,
      State: stationRec.State,
      District: stationRec.District,
      image_url: stationImagePath ? makeUrl(stationImagePath) : null,
    };

    const restaurants = (filtered || []).map((r) => {
      const img = pickImagePathFromRecord(r);
      return {
        code: r.code,
        name: r.name,
        rating: r.rating ?? null,
        type: r.type ?? null,
        cuisines: Array.isArray(r.cuisines) ? r.cuisines : (r.cuisines ? String(r.cuisines).split(",").map(s=>s.trim()) : []),
        min_order: r.min_order ?? null,
        image_url: img ? makeUrl(img) : null,
        fssai: r.fssai ?? null,
      };
    });

    return NextResponse.json({ station, restaurants });
  } catch (err) {
    console.error("stations/[code] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
