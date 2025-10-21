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

type RestroRow = {
  RestroCode?: number | string;
  RestroName?: string;
  RestroRating?: number | null;
  IsPureVeg?: number | boolean | null;
  RestroDisplayPhoto?: string | null;
  OpenTime?: string | null;
  ClosedTime?: string | null;
  MinimumOrderValue?: number | null;
  IsActive?: boolean | null;
  --?: any;
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

    const PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!PROJECT_URL) {
      return NextResponse.json({ error: "SUPABASE URL not configured" }, { status: 500 });
    }
    if (!SERVICE_KEY) {
      return NextResponse.json({ error: "SUPABASE service key not configured" }, { status: 500 });
    }

    // Helper to build public storage URL (assumes bucket name 'public')
    const buildPublicImageUrl = (path?: string | null) => {
      if (!path) return null;
      if (/^https?:\/\//i.test(path)) return path;
      // Ensure no leading slash
      const cleaned = path.replace(/^\/+/, "");
      return `${PROJECT_URL.replace(/\/$/, "")}/storage/v1/object/public/public/${encodeURIComponent(cleaned)}`;
    };

    // 1) Fetch station metadata (Stations table)
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

    if (!stationResp.ok) {
      const txt = await stationResp.text();
      console.error("Station fetch error:", stationResp.status, txt);
      // Continue — station may not exist; still query restaurants
    }

    const stationJson: StationRow[] = await stationResp.json().catch(() => []);
    const station = stationJson && stationJson.length ? stationJson[0] : null;

    // 2) Fetch restaurants from RestroMaster table
    // Adjust column names if your table uses different names
    const selectCols = [
      "RestroCode",
      "RestroName",
      "RestroRating",
      "IsPureVeg",
      "RestroDisplayPhoto",
      "OpenTime",
      "ClosedTime",
      "MinimumOrderValue",
      "IsActive",
      "FssaiActive" // include to double-check / filter if present
    ].join(",");

    // Query: StationCode eq code AND IsActive = true AND (FssaiActive = true OR FssaiActive IS NULL)
    // PostgREST filters: use eq.true or is.null etc.
    // We'll request rows and filter FSSAI in JS if column name differs.
    const restroUrl = `${PROJECT_URL.replace(/\/$/, "")}/rest/v1/RestroMaster?select=${encodeURIComponent(
      selectCols
    )}&StationCode=eq.${encodeURIComponent(code)}&IsActive=eq.true`;

    const restroResp = await fetch(restroUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        accept: "application/json",
      },
    });

    if (!restroResp.ok) {
      const txt = await restroResp.text();
      console.error("RestroMaster fetch error:", restroResp.status, txt);
      return NextResponse.json({ error: "Failed to fetch restaurants" }, { status: 502 });
    }

    const restroRows: any[] = await restroResp.json().catch(() => []);

    // 3) Filter out FSSAI-inactive rows (common column names: FssaiActive, FSSAIactive, FSSAIinactive)
    const normalizeAndFilter = (row: any) => {
      // detect FSSAI flags:
      const fssaiActive =
        row.FssaiActive ?? row.FSSAIActive ?? (row.FSSAIinactive !== undefined ? !row.FSSAIinactive : undefined);

      // Only include if FSSAIactive is true or undefined (if undefined, assume allowed)
      if (fssaiActive === false) return null;

      // Map isPureVeg: if numeric 1 => true
      const isPureVeg = row.IsPureVeg === 1 || row.IsPureVeg === "1" || row.IsPureVeg === true;

      const photoUrl = buildPublicImageUrl(row.RestroDisplayPhoto);

      return {
        RestroCode: row.RestroCode,
        RestroName: row.RestroName,
        RestroRating: row.RestroRating ?? null,
        isPureVeg,
        RestroDisplayPhoto: photoUrl,
        OpenTime: row.OpenTime ?? null,
        ClosedTime: row.ClosedTime ?? null,
        MinimumOrderValue: row.MinimumOrderValue ?? null,
      };
    };

    const restaurants = restroRows
      .map(normalizeAndFilter)
      .filter(Boolean) as Array<{
        RestroCode: number | string;
        RestroName?: string;
        RestroRating?: number | null;
        isPureVeg?: boolean;
        RestroDisplayPhoto?: string | null;
        OpenTime?: string | null;
        ClosedTime?: string | null;
        MinimumOrderValue?: number | null;
      }>;

    // 4) Final JSON shape
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
      restaurants,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("api/stations/[code] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
