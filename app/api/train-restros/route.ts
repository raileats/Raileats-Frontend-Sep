// app/api/train-restros/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

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

async function pMap(items: any[], mapper: any) {
  const results: any[] = [];
  for (const item of items) {
    results.push(await mapper(item));
  }
  return results;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const trainParam = url.searchParams.get("train");
    const date = url.searchParams.get("date");
    const boarding = url.searchParams.get("boarding");

    if (!trainParam || !date || !boarding) {
      return NextResponse.json({ ok: false, error: "missing params" });
    }

    const { data: stopsRows } = await serviceClient
      .from("TrainRoute")
      .select("*")
      .eq("trainNumber", Number(trainParam));

    if (!stopsRows || !stopsRows.length) {
      return NextResponse.json({ ok: true, stations: [] });
    }

    const stationCodes = stopsRows.map((s: any) =>
      normalizeCode(s.StationCode)
    );

    const { data: restroRows } = await serviceClient
      .from("RestroMaster")
      .select("*")
      .in("StationCode", stationCodes);

    const grouped: Record<string, any[]> = {};

    for (const r of restroRows || []) {
      const sc = normalizeCode(r.StationCode);
      if (!grouped[sc]) grouped[sc] = [];
      grouped[sc].push(r);
    }

    const stations: any[] = [];

    for (const s of stopsRows) {
      const sc = normalizeCode(s.StationCode);
      const vendorsRaw = grouped[sc] || [];

      const candidateVendors = vendorsRaw
        .filter((r: any) => isActiveValue(r.IsActive))
        .map((r: any) => ({
          RestroCode: r.RestroCode,
          RestroName: r.RestroName,
          OpenTime: r.OpenTime ?? r.open_time ?? null,
          ClosedTime: r.ClosedTime ?? r.closed_time ?? null,
          MinimumOrdermValue: r.MinimumOrdermValue,
          RestroDisplayPhoto: r.RestroDisplayPhoto,
          IsPureVeg: r.IsPureVeg ?? 0,
          raw: r,
        }));

      const checked = await pMap(candidateVendors, async (cv: any) => cv);

      const vendors = (checked || []).filter(Boolean);

      if (vendors.length) {
        stations.push({
          StationCode: sc,
          StationName: s.StationName,
          vendors,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      train: { trainNumber: trainParam },
      stations,
    });

  } catch (e) {
    console.error("train-restros error", e);
    return NextResponse.json({ ok: false, error: "server_error" });
  }
}
