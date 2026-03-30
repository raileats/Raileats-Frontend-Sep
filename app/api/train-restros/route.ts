import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

/* utils */
function normalizeCode(val: any) {
  return String(val ?? "").toUpperCase().trim();
}

function isActiveValue(val: any) {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  if (typeof val === "string") {
    const t = val.trim().toLowerCase();
    return !["0", "false", "no", "n", ""].includes(t);
  }
  return true;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const train = (url.searchParams.get("train") || "").trim();
    const date = (url.searchParams.get("date") || "").trim();
    const boarding = normalizeCode(url.searchParams.get("boarding"));

    if (!train || !date || !boarding) {
      return NextResponse.json({ ok: false, error: "missing params" });
    }

    /* 1️⃣ TRAIN ROUTE (FIXED) */
    const { data: stopsRows } = await serviceClient
      .from("TrainRoute")
      .select("*")
      .eq("trainNumber", train) // ✅ FIX (no Number)
      .order("StnNumber", { ascending: true });

    if (!stopsRows || stopsRows.length === 0) {
      return NextResponse.json({ ok: true, stations: [] });
    }

    /* 2️⃣ START FROM BOARDING */
    const startIdx = stopsRows.findIndex(
      (r: any) =>
        normalizeCode(r.StationCode || r.stationcode) === boarding
    );

    const route =
      startIdx >= 0 ? stopsRows.slice(startIdx) : stopsRows;

    /* 3️⃣ STATION CODES */
    const codes = Array.from(
      new Set(
        route
          .map((r: any) =>
            normalizeCode(r.StationCode || r.stationcode)
          )
          .filter(Boolean)
      )
    );

    /* 4️⃣ RESTRO FETCH (FIXED CASE) */
    const { data: restroRows } = await serviceClient
      .from("RestroMaster")
      .select(
        "RestroCode,RestroName,StationCode,open_time,closed_time,MinimumOrdermValue,IsActive,IsPureVeg,RestroDisplayPhoto"
      )
      .in(
        "StationCode",
        codes.map((c) => c.toLowerCase()) // ✅ FIX
      );

    /* DEBUG */
    console.log("CODES:", codes);
    console.log("RESTROS:", restroRows);

    /* 5️⃣ GROUP BY STATION */
    const grouped: Record<string, any[]> = {};

    for (const r of restroRows || []) {
      const sc = normalizeCode(r.StationCode || r.stationcode); // ✅ FIX

      if (!grouped[sc]) grouped[sc] = [];
      grouped[sc].push(r);
    }

    /* 6️⃣ BUILD RESPONSE */
    const stations: any[] = [];

    for (const s of route) {
      const sc = normalizeCode(s.StationCode || s.stationcode);

      const vendorsRaw = grouped[sc] || [];

      const vendors = vendorsRaw
        .filter((r: any) => isActiveValue(r.IsActive))
        .map((r: any) => ({
          RestroCode: r.RestroCode,
          RestroName: r.RestroName,
          OpenTime: r.open_time, // ✅ FIX
          ClosedTime: r.closed_time, // ✅ FIX
          MinimumOrdermValue: r.MinimumOrdermValue,
          RestroDisplayPhoto: r.RestroDisplayPhoto,
          IsPureVeg: r.IsPureVeg ?? 0,
        }));

      if (!vendors.length) continue;

      stations.push({
        StationCode: sc,
        StationName: s.StationName,
        arrival_time: s.Arrives || null,
        halt_time: null,
        vendors,
      });
    }

    return NextResponse.json({
      ok: true,
      train: { trainNumber: train },
      stations,
    });

  } catch (e) {
    console.error("ERROR:", e);

    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
