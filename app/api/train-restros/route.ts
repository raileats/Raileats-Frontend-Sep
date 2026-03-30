import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

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

/* main */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const train = url.searchParams.get("train") || "";
    const date = url.searchParams.get("date") || "";
    const boarding = normalizeCode(url.searchParams.get("boarding"));

    if (!train || !date || !boarding) {
      return NextResponse.json({ ok: false, error: "missing params" });
    }

    /* 1️⃣ train route */
    const { data: stopsRows } = await serviceClient
      .from("TrainRoute")
      .select("*")
      .eq("trainNumber", Number(train))
      .order("StnNumber", { ascending: true });

    if (!stopsRows?.length) {
      return NextResponse.json({ ok: true, stations: [] });
    }

    /* 2️⃣ from boarding */
    const startIdx = stopsRows.findIndex(
      (r: any) => normalizeCode(r.StationCode) === boarding
    );
    const route = stopsRows.slice(startIdx >= 0 ? startIdx : 0);

    /* 3️⃣ station codes */
    const codes = Array.from(
      new Set(route.map((r: any) => normalizeCode(r.StationCode)))
    );

    /* 4️⃣ fetch restros */
    const { data: restroRows } = await serviceClient
      .from("RestroMaster")
      .select(
        "RestroCode,RestroName,StationCode,StationName,open_time,closed_time,MinimumOrdermValue,IsActive,IsPureVeg,RestroDisplayPhoto"
      )
     .in("StationCode", codes.map(c => c.toLowerCase()))
    const grouped: any = {};
    for (const r of restroRows || []) {
      const sc = normalizeCode(r.StationCode);
      if (!grouped[sc]) grouped[sc] = [];
      grouped[sc].push(r);
    }

    /* 5️⃣ build response */
    const stations: any[] = [];

    for (const s of route) {
      const sc = normalizeCode(s.StationCode);
      const vendorsRaw = grouped[sc] || [];

      const vendors = vendorsRaw
        .filter((r: any) => isActiveValue(r.IsActive))
        .map((r: any) => ({
          RestroCode: r.RestroCode,
          RestroName: r.RestroName,
          OpenTime: r.open_time,
          ClosedTime: r.closed_time,
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
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
