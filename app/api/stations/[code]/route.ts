// app/api/stations/[code]/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function makeSupabaseClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_ROLE;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
}

export async function GET(req: Request, { params }: { params: { code: string } }) {
  try {
    const supabase = makeSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Server config missing SUPABASE_URL or SUPABASE_SERVICE_ROLE" }, { status: 500 });
    }

    const code = (params.code || "").toString().toUpperCase();
    if (!code) return NextResponse.json({ error: "station code required" }, { status: 400 });

    // 1) Station record (from Stations table)
    const { data: stationRec, error: stErr } = await supabase
      .from("Stations")
      .select("StationCode, StationName, State, District, StationImage, storage_image_path") // include potential image fields
      .eq("StationCode", code)
      .maybeSingle();

    if (stErr) {
      console.error("stations fetch error:", stErr);
      return NextResponse.json({ error: stErr.message }, { status: 500 });
    }
    if (!stationRec) return NextResponse.json({ error: "Station not found" }, { status: 404 });

    // helper: build public URL from supabase storage if path present
    const makeUrl = (path?: string | null) => {
      if (!path) return null;
      try {
        // attempt storage public bucket
        const { data } = supabase.storage.from("public").getPublicUrl(path);
        return data?.publicUrl || null;
      } catch (e) {
        return null;
      }
    };

    // station image: try common fields
    const stationImagePath = stationRec.storage_image_path ?? stationRec.StationImage ?? null;
    const station = {
      StationCode: stationRec.StationCode,
      StationName: stationRec.StationName,
      State: stationRec.State,
      District: stationRec.District,
      image_url: stationImagePath ? makeUrl(stationImagePath) : null,
      raw_image_path: stationImagePath ?? null,
    };

    // 2) Get restaurants from RestroMaster table for this station where RaileatsStatus = 1
    // Note: your DB column names appear to be capitalized — use exact names if case-sensitive in your DB / supabase
    let restroRows: any[] = [];
    try {
      const { data, error } = await supabase
        .from("RestroMaster")
        .select(
          "RestroCode, RestroName, RestroRating, RestroDisplayPhoto, MinimumOrdermValue, StationCode, RaileatsStatus, FSSAIStatus"
        )
        .eq("StationCode", code)
        .eq("RaileatsStatus", 1); // only those enabled in admin

      if (error) {
        // log and return empty list rather than 500 (so page still shows station)
        console.warn("RestroMaster fetch error:", error.message);
        restroRows = [];
      } else {
        restroRows = data ?? [];
      }
    } catch (e) {
      console.warn("RestroMaster fetch exception:", String(e));
      restroRows = [];
    }

    // 3) For each restro check FSSAI validity using restro_fssai table (if present)
    const now = new Date().toISOString().slice(0, 10);
    const filtered: any[] = [];

    for (const r of restroRows) {
      try {
        // Try to fetch latest FSSAI record for this restro code (table name guessed: restro_fssai)
        const { data: rf, error: rfErr } = await supabase
          .from("restro_fssai")
          .select("fssai_number, expiry_date, is_active, FSSAIStatus") // include common fields
          .eq("restro_code", r.RestroCode)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rfErr) {
          // if table not present or other error, log & fallback to checking RestroMaster.FSSAIStatus
          console.warn("restro_fssai fetch error for", r.RestroCode, rfErr.message);
        }

        // Interpret FSSAI active:
        // - if restro_fssai exists, prefer its flags (is_active true OR expiry_date>now OR FSSAIStatus === 'Active')
        // - else fallback to RestroMaster.FSSAIStatus column if present and equals 'Active' or 1.
        let hasFssai = false;
        if (rf) {
          if (
            (typeof rf.is_active !== "undefined" && rf.is_active === true) ||
            (rf.expiry_date && rf.expiry_date > now) ||
            (typeof rf.FSSAIStatus === "string" && rf.FSSAIStatus.toLowerCase() === "active")
          ) {
            hasFssai = true;
          }
        } else if (typeof r.FSSAIStatus !== "undefined") {
          // fallback to RestroMaster.FSSAIStatus
          const v = r.FSSAIStatus;
          if (v === 1 || (typeof v === "string" && v.toLowerCase() === "active")) hasFssai = true;
        } else {
          // If no FSSAI info at all, decide whether to include or exclude.
          // For safety, exclude if you require FSSAI. If you want to include even without FSSAI, set hasFssai = true.
          hasFssai = false;
        }

        if (hasFssai) {
          filtered.push({ ...r, latest_fssai: rf ?? null });
        }
      } catch (e) {
        console.warn("fssai lookup exception for", r.RestroCode, String(e));
        // skip this restro on error
      }
    }

    // 4) map results to expected shape and build image urls (try storage public then fallback to prefix)
    const imagePrefix = process.env.NEXT_PUBLIC_IMAGE_PREFIX ?? "";

    const mapped = filtered.map((r) => {
      const photoPath = r.RestroDisplayPhoto ?? null;
      const image_url = photoPath ? makeUrl(photoPath) || (imagePrefix ? `${imagePrefix}${photoPath}` : null) : null;

      return {
        code: r.RestroCode,
        name: r.RestroName,
        rating: r.RestroRating ?? null,
        min_order: r.MinimumOrdermValue ?? null,
        image_url,
        raw_photo_path: photoPath,
        fssai: r.latest_fssai ?? null,
      };
    });

    return NextResponse.json({ station, restaurants: mapped });
  } catch (err) {
    console.error("stations/[code] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
