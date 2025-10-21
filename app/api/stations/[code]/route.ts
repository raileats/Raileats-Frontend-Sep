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
  for (const c of candidates) {
    if (rec[c]) return rec[c];
  }
  return null;
}

export async function GET(req: Request, { params }: { params: { code: string } }) {
  try {
    const supabase = makeSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Server config missing SUPABASE_URL or SUPABASE_SERVICE_ROLE" },
        { status: 500 }
      );
    }

    const code = (params.code || "").toString().toUpperCase();
    if (!code) return NextResponse.json({ error: "station code required" }, { status: 400 });

    // 1) get station record safely
    let stationRec: any = null;
    try {
      const { data, error } = await supabase.from("Stations").select("*").eq("StationCode", code).maybeSingle();
      if (error) {
        // if table missing or other DB error, return error
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      stationRec = data;
      if (!stationRec) return NextResponse.json({ error: "Station not found" }, { status: 404 });
    } catch (err: any) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }

    // 2) get restros safely — table might not exist; handle gracefully
    let restros: any[] = [];
    try {
      const { data, error } = await supabase.from("restros").select("*").eq("station_code", code).eq("is_active", true);
      if (error) {
        // If error mentions table missing, handle by returning empty list (but log for debugging)
        console.warn("restros fetch error:", error.message);
        restros = [];
      } else {
        restros = data ?? [];
      }
    } catch (err: any) {
      console.warn("restros fetch exception:", String(err));
      restros = [];
    }

    // 3) filter by latest FSSAI where available
    const now = new Date().toISOString().slice(0, 10);
    const filtered: any[] = [];
    for (const r of restros) {
      try {
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
        if (hasFssaiActive) {
          filtered.push({ ...r, fssai: rf });
        }
      } catch (e) {
        console.warn("fssai fetch exception for", r.code, String(e));
        continue;
      }
    }

    // 4) build public URLs for images (public bucket assumed)
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
        cuisines: Array.isArray(r.cuisines) ? r.cuisines : (r.cuisines ? String(r.cuisines).split(",").map((s:string)=>s.trim()) : []),
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
