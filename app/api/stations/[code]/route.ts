// app/api/stations/[code]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

type StationRow = {
  StationCode?: string;
  StationName?: string;
  State?: string;
  District?: string;
  image_url?: string | null;
};

export async function GET(
  _request: Request,
  { params }: { params: { code?: string } }
) {
  try {
    const codeRaw = params?.code || "";
    const code = String(codeRaw).toUpperCase().trim();

    if (!code) {
      return NextResponse.json({ error: "Missing station code" }, { status: 400 });
    }

    const PROJECT_URL =
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const SERVICE_KEY =
      process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!PROJECT_URL) {
      return NextResponse.json({ error: "SUPABASE URL not configured" }, { status: 500 });
    }
    if (!SERVICE_KEY) {
      return NextResponse.json({ error: "SUPABASE service key not configured" }, { status: 500 });
    }

    // Helper: build public image URL (assumes bucket name 'public')
    const buildPublicImageUrl = (path?: string | null) => {
      if (!path) return null;
      if (/^https?:\/\//i.test(path)) return path;
      const cleaned = String(path).replace(/^\/+/, "");
      return `${PROJECT_URL.replace(/\/$/, "")}/storage/v1/object/public/public/${encodeURIComponent(cleaned)}`;
    };

    // 1) Fetch station metadata
    const stationUrl = `${PROJECT_URL.replace(/\/$/, "")}/rest/v1/Stations?select=StationCode,StationName,State,District,image_url&StationCode=eq.${encodeURIComponent(
      code
    )}&limit=1`;

    const stationResp = await fetch(stationUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        accept: "application/json",
      },
    });

    let station: StationRow | null = null;
    if (stationResp.ok) {
      const stationJson: StationRow[] = await stationResp.json().catch(() => []);
      station = stationJson && stationJson.length ? stationJson[0] : null;
    } else {
      // log but continue — restaurants may still be available
      const txt = await stationResp.text().catch(() => "");
      console.error("Station fetch error:", stationResp.status, txt);
    }

    // 2) Fetch restaurants from RestroMaster
    // NOTE: Using exact column names observed in your CSV:
    // "RestroCode","RestroName","RestroRating","IsPureVeg","RestroDisplayPhoto",
    // "0penTime","ClosedTime","MinimumOrdermValue","IsActive","FSSAIStatus","RaileatsStatus"
    const selectCols = [
      "RestroCode",
      "RestroName",
      "RestroRating",
      "IsPureVeg",
      "RestroDisplayPhoto",
      "0penTime",
      "ClosedTime",
      "MinimumOrdermValue",
      "IsActive",
      "FSSAIStatus",
      "RaileatsStatus",
      "StationCode",
      "StationName"
    ].join(",");

    // Query: StationCode eq code AND IsActive = true (some datasets use RaileatsStatus numeric 1 for active)
    // We will request rows and then filter for FSSAIStatus = 'Active' (case-insensitive) and IsActive/RaileatsStatus.
    const restroUrl = `${PROJECT_URL.replace(/\/$/, "")}/rest/v1/RestroMaster?select=${encodeURIComponent(
      selectCols
    )}&StationCode=eq.${encodeURIComponent(code)}`;

    const restroResp = await fetch(restroUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        accept: "application/json",
      },
    });

    if (!restroResp.ok) {
      const txt = await restroResp.text().catch(() => "");
      console.error("RestroMaster fetch error:", restroResp.status, txt);
      return NextResponse.json({ error: "Failed to fetch restaurants" }, { status: 502 });
    }

    const restroRows: any[] = await restroResp.json().catch(() => []);

    // 3) Normalize & filter rows
    const normalized = restroRows
      .map((row) => {
        // Determine activity: prefer IsActive boolean, else RaileatsStatus numeric (1=active)
        const isActive =
          row.IsActive === true ||
          String(row.IsActive).toLowerCase() === "true" ||
          String(row.RaileatsStatus) === "1" ||
          String(row.RaileatsStatus).toLowerCase() === "active";

        // FSSAI: column `FSSAIStatus` may be 'Active' / 'Inactive' / 'On' / 'Off'
        const fssaiStatus = row.FSSAIStatus ?? row.FssaiStatus ?? row.Fssai_Status;
        const fssaiActive =
          fssaiStatus === undefined ||
          fssaiStatus === null ||
          String(fssaiStatus).toLowerCase() === "active" ||
          String(fssaiStatus).toLowerCase() === "on" ||
          String(fssaiStatus).toLowerCase() === "yes" ||
          String(fssaiStatus).trim() === "";

        // Map IsPureVeg numeric 1 => true
        const isPureVeg =
          row.IsPureVeg === 1 || row.IsPureVeg === "1" || String(row.IsPureVeg).toLowerCase() === "true";

        const photoUrl = buildPublicImageUrl(row.RestroDisplayPhoto);

        return {
          RestroCode: row.RestroCode,
          RestroName: row.RestroName,
          RestroRating: row.RestroRating ?? null,
          isPureVeg,
          RestroDisplayPhoto: photoUrl,
          OpenTime: row["0penTime"] ?? null,
          ClosedTime: row.ClosedTime ?? null,
          MinimumOrdermValue: row.MinimumOrdermValue ?? null,
          _isActiveRaw: isActive,
          _fssaiActiveRaw: fssaiActive,
        };
      })
      // keep only active && fssaiActive
      .filter((r) => r._isActiveRaw && r._fssaiActiveRaw)
      // remove internal flags from response
      .map(({ _isActiveRaw, _fssaiActiveRaw, ...rest }) => rest);

    const result = {
      station: station
        ? {
            StationCode: station.StationCode ?? code,
            StationName: station.StationName ?? null,
            State: station.State ?? null,
            District: station.District ?? null,
            image_url: station.image_url ? buildPublicImageUrl(station.image_url) : null,
          }
        : { StationCode: code, StationName: null },
      restaurants: normalized,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("api/stations/[code] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
