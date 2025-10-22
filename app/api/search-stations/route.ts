// app/api/search-stations/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const SERVICE_KEY =
      process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
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

    const url = new URL(request.url);
    const qRaw = (url.searchParams.get("q") || "").trim();

    let apiUrl: string;
    if (qRaw) {
      // Use wildcard both sides for partial matches. Build safe or() expression and encode it.
      // PostgREST syntax example: or=(StationName.ilike.*BPL*,StationCode.ilike.*BPL*)
      const qSafe = qRaw.replace(/[()'"]/g, ""); // remove problematic chars
      const orExpr = `(StationName.ilike.*${qSafe}*,StationCode.ilike.*${qSafe}*)`;
      const encodedOr = encodeURIComponent(orExpr);
      apiUrl = `${PROJECT_URL.replace(/\/$/, "")}/rest/v1/Stations?select=StationId,StationName,StationCode,State,District,Lat,Long&or=${encodedOr}&limit=30`;
    } else {
      apiUrl = `${PROJECT_URL.replace(/\/$/, "")}/rest/v1/Stations?select=StationId,StationName,StationCode,State&limit=10`;
    }

    const resp = await fetch(apiUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Accept: "application/json",
      },
      // no-store so always fresh
      cache: "no-store",
    });

    const text = await resp.text();
    try {
      const data = JSON.parse(text);
      // Keep same wrapper structure your client expects
      return NextResponse.json({ status: resp.status, data }, { status: 200 });
    } catch {
      // if response not JSON, pass raw
      return new NextResponse(text, { status: resp.status });
    }
  } catch (err) {
    console.error("search-stations error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
