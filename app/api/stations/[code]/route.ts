// debug version — replaces app/api/stations/[code]/route.ts temporarily
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
    if (!supabase) return NextResponse.json({ error: "Missing supabase env" }, { status: 500 });

    const code = (params.code || "").toString().toUpperCase();
    if (!code) return NextResponse.json({ error: "station code required" }, { status: 400 });

    // fetch station
    const { data: stationRec, error: stErr } = await supabase
      .from("Stations")
      .select("*")
      .eq("StationCode", code)
      .maybeSingle();

    // fetch restros from RestroMaster (no FSSAI filter yet)
    const { data: restroRows, error: rErr } = await supabase
      .from("RestroMaster")
      .select("*")
      .eq("StationCode", code);

    // attempt to fetch restro_fssai for first restro (if exists) as sample
    let rfSample = null;
    if (Array.isArray(restroRows) && restroRows.length > 0) {
      try {
        const rc = restroRows[0].RestroCode;
        const { data, error } = await supabase
          .from("restro_fssai")
          .select("*")
          .eq("restro_code", rc)
          .order("created_at", { ascending: false })
          .limit(5);
        rfSample = { error: error?.message ?? null, data };
      } catch (e) {
        rfSample = { error: String(e), data: null };
      }
    }

    return NextResponse.json({
      env_ok: !!process.env.SUPABASE_SERVICE_ROLE,
      stationRec,
      stationErr: stErr?.message ?? null,
      restroRows: restroRows ?? [],
      restroErr: rErr?.message ?? null,
      restro_fssai_sample: rfSample,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
