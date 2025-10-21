// app/api/stations/[code]/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

// safe client creator
function makeSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
}

function pickImagePathFromRecord(rec: any) {
  if (!rec) return null;
  const names = [
    "storage_image_path",
    "StationImage",
    "StationImagePath",
    "image_path",
    "photo",
    "photo_url",
    "image_url",
    "RestroDisplayPhoto",
    "restro_display_photo"
  ];
  for (const n of names) {
    if (rec[n]) return rec[n];
  }
  return null;
}

export async function GET(req: Request, { params }: { params: { code: string } }) {
  try {
    const supabase = makeSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Server misconfigured: SUPABASE_SERVICE_ROLE missing" }, { status: 500 });
    }

    const code = (params.code || "").toString().trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "station code required" }, { status: 400 });

    // 1) Station record
    const { data: stationRec, error: sErr } = await supabase
      .from("Stations")
      .select("*")
      .eq("StationCode", code)
      .maybeSingle();

    if (sErr) {
      console.error("stations fetch error:", sErr);
      return NextResponse.json({ error: sErr.message }, { status: 500 });
    }
    if (!stationRec) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    // 2) Restaurants: use RestroMaster (as in admin). Filter RaileatsStatus = 1
    let { data: restros, error: rErr } = await supabase
      .from("RestroMaster")
      .select("*")
      .eq("StationCode", code)
      .eq("RaileatsStatus", 1);

    if (rErr) {
      // Try alternate table name if needed (e.g., "restros")
      console.warn("RestroMaster fetch error, trying 'restros' fallback:", rErr.message);
      const { data: d2, error: r2 } = await supabase
        .from("restros")
        .select("*")
        .eq("station_code", code)
        .eq("is_active", true);
      restros = r2 ? [] : d2 ?? [];
    }
    restros = restros ?? [];

    // 3) Filter by FSSAI — for each restro try to find latest restro_fssai entry or fallback to RestroMaster's FSSAIStatus
    const today = new Date().toISOString().slice(0, 10);
    const filtered: any[] = [];
    for (const r of restros) {
      try {
        // prefer restro_fssai table latest row
        const { data: rf, error: rfErr } = await supabase
          .from("restro_fssai")
          .select("fssai_number, expiry_date, is_active")
          .eq("restro_code", r.RestroCode ?? r.code ?? r.restro_code)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rfErr) {
          console.warn("fssai fetch error for", r.RestroCode, rfErr.message);
        }

        // If restro_fssai says active and expiry_date > today => accept
        let hasFssaiActive = false;
        if (rf && rf.is_active && rf.expiry_date && rf.expiry_date > today) hasFssaiActive = true;

        // fallback: if RestroMaster has a column FSSAIStatus or FSSAIStatus === 'Active' or FSSAIStatus === 1
        if (!hasFssaiActive) {
          const fssaiStatusVal = r.FSSAIStatus ?? r.fssai_status ?? r.FSSAIStatus;
          if (fssaiStatusVal !== undefined) {
            const vs = String(fssaiStatusVal).toLowerCase();
            if (vs === "active" || vs === "1" || vs === "true") hasFssaiActive = true;
          }
        }

        if (hasFssaiActive) {
          filtered.push({ ...r, fssai: rf ?? null });
        } else {
          // skip restro without active FSSAI
        }
      } catch (e) {
        console.warn("exception checking fssai for", r.RestroCode, e);
      }
    }

    // 4) helper to build public URLs from storage path (assume bucket 'public' or path already contains)
    const makeUrl = (path?: string | null) => {
      if (!path) return null;
      try {
        // if it's already a full URL, return
        if (String(path).startsWith("http")) return path;
        const bucket = "public"; // default - change if your bucket name differs
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data?.publicUrl ?? null;
      } catch (e) {
        return null;
      }
    };

    const stationImagePath = pickImagePathFromRecord(stationRec);
    const station = {
      StationCode: stationRec.StationCode,
      StationName: stationRec.StationName,
      State: stationRec.State,
      District: stationRec.District,
      image_url: makeUrl(stationImagePath),
    };

    const restaurants = filtered.map((r: any) => {
      const imgPath = pickImagePathFromRecord(r) || r.RestroDisplayPhoto || r.restro_display_photo;
      const image_url = makeUrl(imgPath);
      // cuisines normalization
      let cuisines: string[] = [];
      if (Array.isArray(r.Cuisines)) cuisines = r.Cuisines;
      else if (Array.isArray(r.cuisines)) cuisines = r.cuisines;
      else if (r.Cuisines) cuisines = String(r.Cuisines).split(",").map((s: string) => s.trim());
      else if (r.cuisines) cuisines = String(r.cuisines).split(",").map((s: string) => s.trim());

      const minOrder = r.MinimumOrdermValue ?? r.min_order ?? r.MinimumOrder ?? r.MinOrder;

      return {
        code: r.RestroCode ?? r.code ?? r.restro_code,
        name: r.RestroName ?? r.name ?? r.restro_name,
        rating: r.RestroRating ?? r.rating ?? null,
        type: (r.RestroType || r.type) ?? null,
        cuisines,
        min_order: minOrder ?? null,
        image_url,
        fssai: r.fssai ?? null,
      };
    });

    return NextResponse.json({ station, restaurants });
  } catch (err) {
    console.error("stations/[code] route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
