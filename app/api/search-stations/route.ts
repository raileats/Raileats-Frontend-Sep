// app/api/search-stations/route.ts

// Tell Next.js this route is intentionally dynamic (so build won't bail out
// when we read request.url / search params).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // NOTE: Ensure this exact env var name exists in Vercel (Production):
    // SUPABASE_SERVICE_ROLE
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE;
    // Accept either NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL (server var)
    const PROJECT_URL =
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

    if (!SERVICE_KEY) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE not configured" },
        { status: 500 }
      );
    }
    if (!PROJECT_URL) {
      return NextResponse.json(
        { error: "SUPABASE_URL not configured" },
        { status: 500 }
      );
    }

    // We intentionally read request.url here — route marked force-dynamic above.
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();

    let apiUrl: string;
    if (q) {
      // use ilike with wildcard suffix; encode properly
      const enc = encodeURIComponent(q + "%");
      apiUrl = `${PROJECT_URL}/rest/v1/Stations?select=StationId,StationName,StationCode,State,District,Lat,Long&or=(StationName.ilike.${enc},StationCode.ilike.${enc})&limit=30`;
    } else {
      apiUrl = `${PROJECT_URL}/rest/v1/Stations?select=StationId,StationName,StationCode,State&limit=10`;
    }

    const resp = await fetch(apiUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Accept: "application/json",
      },
    });

    const text = await resp.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json({ status: resp.status, data }, { status: 200 });
    } catch {
      // if response is not JSON, return raw text
      return new NextResponse(text, { status: resp.status });
    }
  } catch (err) {
    console.error("search-stations error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
