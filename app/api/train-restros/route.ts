export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* ================= SUPABASE ================= */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ================= HELPERS ================= */

function normalizeCode(val: any) {
  return String(val || "").trim().toUpperCase();
}

/* ================= API ================= */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const trainNumber = searchParams.get("train");
    const date = searchParams.get("date");
    const boarding = searchParams.get("boarding");

    if (!trainNumber || !date || !boarding) {
      return NextResponse.json(
        { ok: false, error: "missing_params" },
        { status: 400 }
      );
    }

    /* ================= FETCH ROUTE ================= */

    const { data: routeRows } = await supabase
      .from("TrainRoute")
      .select("*")
      .eq("TrainNo", trainNumber);

    if (!routeRows?.length) {
      return NextResponse.json({ ok: true, stations: [] });
    }

    /* ================= FETCH RESTRO ================= */

    const { data: restroRows } = await supabase
      .from("RestroMaster")
      .select(`
        RestroCode,
        RestroName,
        StationCode,
        open_time,
        closed_time,
        MinimumOrdermValue,
        IsActive,
        IsPureVeg,
        RestroDisplayPhoto
      `)
      .eq("IsActive", true);

    /* ================= GROUP RESTROS ================= */

    const grouped: Record<string, any[]> = {};

    for (const r of restroRows || []) {
      const sc = normalizeCode(r.StationCode);

      if (!grouped[sc]) grouped[sc] = [];

      grouped[sc].push({
        RestroCode: r.RestroCode,
        RestroName: r.RestroName,
        isActive: true,

        // ✅ FINAL FIX (IMPORTANT)
        OpenTime: r.open_time ?? "00:00:00",
        ClosedTime: r.closed_time ?? "23:59:00",

        MinimumOrdermValue: r.MinimumOrdermValue,
        RestroDisplayPhoto: r.RestroDisplayPhoto,
        IsPureVeg: r.IsPureVeg ?? 0,
      });
    }

    /* ================= BUILD STATIONS ================= */

    const stations: any[] = [];

    for (const s of routeRows) {
      const sc = normalizeCode(
        s.StationCode || s.stationcode || s.station
      );

      const vendors = grouped[sc] || [];

      if (!vendors.length) continue;

      stations.push({
        StationCode: sc,
        StationName: s.StationName || s.stationname,

        arrival_time: s.ArrivalTime || s.arrival_time,
        departure_time: s.DepartureTime || s.departure_time,

        // ✅ HALT TIME FIX
        halt_time: s.StopTime || s.stoptime || "0m",

        vendors,
      });
    }

    /* ================= RESPONSE ================= */

    return NextResponse.json({
      ok: true,
      train: {
        trainNumber,
      },
      stations,
    });

  } catch (err) {
    console.error("train-restros error", err);

    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
