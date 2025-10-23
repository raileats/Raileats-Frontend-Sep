// app/api/search-stations/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

/**
 * Search stations endpoint.
 * - supports query param `q`
 * - also supports path fallback: /api/search-stations/BPL
 *
 * Returns JSON array of station rows (not wrapped).
 */

function getEnv() {
  return {
    PROJECT_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      process.env.SUPABASE_URL ??
      process.env.SUPABASE_PROJECT_URL,
    SERVICE_KEY:
      process.env.SUPABASE_SERVICE_ROLE ??
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SERVICE_KEY,
  };
}

export async function GET(request: Request) {
  try {
    const { PROJECT_URL, SERVICE_KEY } = getEnv();

    if (!SERVICE_KEY) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE not configured" }, { status: 500 });
    }
    if (!PROJECT_URL) {
      return NextResponse.json({ error: "SUPABASE_URL not configured" }, { status: 500 });
    }

    const url = new URL(request.url);
    // support both ?q= and path param fallback (/api/search-stations/BPL)
    let q = (url.searchParams.get("q") || "").trim();
    // path fallback:
    const pathname = url.pathname || "";
    const pathParts = pathname.split("/").filter(Boolean); // e.g. ["api","search-stations","BPL"]
    if (!q && pathParts.length >= 3) {
      q = decodeURIComponent(pathParts[2] || "").trim();
    }

    // Build PostgREST query:
    let apiUrl: string;
    const base = PROJECT_URL.replace(/\/$/, "");

    if (q) {
      // use ilike with surrounding % (case-insensitive)
      const pattern = encodeURIComponent(`%${q}%`);
      apiUrl = `${base}/rest/v1/Stations?select=StationId,StationName,StationCode,State,District,Lat,Long&or=(StationName.ilike.${pattern},StationCode.ilike.${pattern})&limit=30`;
    } else {
      // short list for empty query
      apiUrl = `${base}/rest/v1/Stations?select=StationId,StationName,StationCode,State,District,Lat,Long&limit=10`;
    }

    const resp = await fetch(apiUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Accept: "application/json",
      },
      // No cache so fresh results in server functions
      cache: "no-store",
    });

    const text = await resp.text();
    if (!resp.ok) {
      // forward error details for easier debugging
      let details = text;
      try {
        const j = JSON.parse(text);
        details = j?.message || JSON.stringify(j);
      } catch {}
      return NextResponse.json({ error: "Supabase query failed", status: resp.status, details }, { status: 502 });
    }

    // parse array result; if parsing fails, return text
    try {
      const data = JSON.parse(text);
      // Ensure array
      const arr = Array.isArray(data) ? data : [];
      return NextResponse.json(arr, { status: 200 });
    } catch {
      // return raw text
      return new NextResponse(text, { status: resp.status });
    }
  } catch (err) {
    console.error("search-stations error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
