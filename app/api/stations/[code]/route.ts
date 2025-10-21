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

/**
 * Try common image-field names (include your RestroDisplayPhoto column)
 */
function pickImagePathFromRecord(rec: any) {
  if (!rec) return null;
  const candidates = [
    "storage_image_path",
    "image_path",
    "photo",
    "photo_url",
    "image_url",
    "RestroDisplayPhoto", // your table column
    "RestroPhoto",
  ];
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

    // 1) load station (Stations table)
    let stationRec: any = null;
    try {
      const { data, error } = await supabase
        .from("Stations")
        .select("*")
        .eq("StationCode", code)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      stationRec = data;
      if (!stationRec) return NextResponse.json({ error: "Station not found" }, { status: 404 });
    } catch (err: any) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }

    // 2) load restaurants from RestroMaster where RaileatsStatus = 1 and StationCode matches
    let restros: any[] = [];
    try {
      const { data, error } = await supabase
        .from("RestroMaster")
        .select("*")
        .eq("StationCode", code)
        .eq("RaileatsStatus", 1); // only active ones

      if (error) {
        console.warn("RestroMaster fetch error:", error.message);
        restros = [];
      } else {
        restros = data ?? [];
      }
    } catch (err: any) {
      console.warn("RestroMaster fetch exception:", String(err));
      restros = [];
    }

    // 3) for each restro, fetch latest fssai (if table exists) and keep only restaurants with active FSSAI
    const now = new Date().toISOString().slice(0, 10);
    const filtered: any[] = [];
    for (const r of restros) {
      try {
        // adjust column name in where clause if your restro_fssai uses a different column (e.g., RestroCode)
        const { data: rf, error: rfErr } = await supabase
          .from("restro_fssai")
          .select("fssai_number, expiry_date, is_active")
          .eq("restro_code", r.RestroCode ?? r.RestroCode ?? r.code)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rfErr) {
          console.warn("fssai fetch error for", r.RestroCode, rfErr.message);
          continue;
        }

        const hasFssaiActive = rf && rf.is_active && rf.expiry_date && rf.expiry_date > now;
        if (hasFssaiActive) {
          filtered.push({ ...r, fssai: rf });
        }
      } catch (e) {
        console.warn("fssai fetch exception for", r.RestroCode, String(e));
        continue;
      }
    }

    // 4) build public URL for images (assumes bucket name "public")
    const makeUrl = (path?: string | null) => {
      if (!path) return null;
      try {
        const { data } = supabase.storage.from("public").getPublicUrl(path);
        return data?.publicUrl || null;
      } catch {
        return null;
      }
    };

    // station image: try common names
    const stationImagePath = pickImagePathFromRecord(stationRec);
    const station = {
      StationCode: stationRec.StationCode,
      StationName: stationRec.StationName,
      State: stationRec.State,
      District: stationRec.District,
      image_url: stationImagePath ? makeUrl(stationImagePath) : null,
    };

    // map restaurants to the shape frontend expects, using your RestroMaster column names
    const restaurants = (filtered || []).map((r: any) => {
      // try to read cuisines from likely columns; adjust if you have a specific column
      const cuisines =
        Array.isArray(r.cuisines) && r.cuisines.length
          ? r.cuisines
          : r.Cuisines && Array.isArray(r.Cuisines)
          ? r.Cuisines
          : r.Cuisines
          ? String(r.Cuisines).split(",").map((s: string) => s.trim())
          : [];

      const imgPath = pickImagePathFromRecord(r) || r.RestroDisplayPhoto || r.RestroDisplayPhoto;
      return {
        code: r.RestroCode ?? r.RestroCode ?? r.code,
        name: r.RestroName ?? r.RestroName ?? r.name,
        rating: r.RestroRating ?? r.rating ?? null,
        // type: prefer explicit type column if present; fall back to IsPureVeg
        type:
          r.RestroType ??
          r.RestroTypeofDeliveryRailEatsorVendor ??
          (r.IsPureVeg === 1 || r.IsPureVeg === true ? "Pure Veg" : undefined),
        cuisines,
        min_order: r.MinimumOrdermValue ?? r.min_order ?? null,
        image_url: imgPath ? makeUrl(imgPath) : null,
        fssai: r.fssai ?? null,
      };
    });

    return NextResponse.json({ station, restaurants });
  } catch (err) {
    console.error("stations/[code] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
