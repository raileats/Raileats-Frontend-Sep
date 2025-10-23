// app/api/search-stations/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

const getEnv = () => {
  return {
    PROJECT_URL:
      process.env.SUPABASE_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      process.env.SUPABASE_PROJECT_URL,
    SERVICE_KEY:
      process.env.SUPABASE_SERVICE_ROLE ??
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SERVICE_KEY,
    FRONTEND_ORIGIN:
      process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_FRONTEND_URL ?? "*",
  };
};

const corsHeaders = (origin: string | null = "*") => ({
  "Access-Control-Allow-Origin": origin ?? "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "600",
  "Content-Type": "application/json; charset=utf-8",
});

export async function OPTIONS() {
  const { FRONTEND_ORIGIN } = getEnv();
  return new NextResponse(null, { status: 204, headers: corsHeaders(FRONTEND_ORIGIN) });
}

export async function GET(request: Request) {
  const { PROJECT_URL, SERVICE_KEY, FRONTEND_ORIGIN } = getEnv();
  const headers = corsHeaders(FRONTEND_ORIGIN ?? "*");

  try {
    if (!PROJECT_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500, headers });
    }

    const url = new URL(request.url);
    const qRaw = (url.searchParams.get("q") || "").trim();
    const q = qRaw.replace(/\s+/g, " "); // normalize spaces

    // make safe minimal search — require at least 1 char (you can change to 2 if you want)
    if (!q) {
      // return empty list (frontend expects array inside data)
      return NextResponse.json({ status: 200, data: [] }, { status: 200, headers });
    }

    // build ilike pattern to search StationName or StationCode
    // we use % wildcard before and after so partial matches appear
    const enc = encodeURIComponent(`%${q}%`);
    const select = encodeURIComponent(
      "StationId,StationName,StationCode,State,District,Lat,Long"
    );

    const apiUrl = `${PROJECT_URL.replace(/\/$/, "")}/rest/v1/Stations?select=${select}&or=(StationName.ilike.${enc},StationCode.ilike.${enc})&limit=30`;

    const resp = await fetch(apiUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await resp.text().catch(() => "");
    if (!resp.ok) {
      // return the underlying error details for debugging
      return NextResponse.json({ error: "Supabase request failed", status: resp.status, details: text }, { status: 502, headers });
    }

    let data: any[] = [];
    try {
      data = JSON.parse(text);
    } catch {
      data = [];
    }

    // normalize shape (ensure minimal fields and types)
    const normalized = (Array.isArray(data) ? data : []).map((s: any) => ({
      StationId: s.StationId ?? s.id ?? null,
      StationName: s.StationName ?? s.station_name ?? "",
      StationCode: s.StationCode ?? s.station_code ?? "",
      State: s.State ?? s.state ?? "",
      District: s.District ?? s.district ?? "",
      Lat: s.Lat ?? s.lat ?? null,
      Long: s.Long ?? s.long ?? null,
    }));

    return NextResponse.json({ status: 200, data: normalized }, { status: 200, headers });
  } catch (err) {
    console.error("search-stations error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500, headers });
  }
}
