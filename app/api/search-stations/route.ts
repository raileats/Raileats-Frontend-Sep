// app/api/search-stations/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // Prefer service role env var (server-side)
    const SERVICE_KEY =
      process.env.SUPABASE_SERVICE_ROLE ??
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SERVICE_KEY;
    const PROJECT_URL =
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

    if (!SERVICE_KEY) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE not configured" }, { status: 500 });
    }
    if (!PROJECT_URL) {
      return NextResponse.json({ error: "SUPABASE_URL not configured" }, { status: 500 });
    }

    const url = new URL(request.url);
    const rawQ = (url.searchParams.get("q") || "").trim();

    // build safe query: use PostgREST ilike with wildcard *...*
    let apiUrl: string;
    if (rawQ) {
      // escape special characters that might break the filter (simple)
      const qSafe = rawQ.replace(/\)/g, "").replace(/\(/g, "");
      // build or filter and encode whole filter expression
      const orFilter = `(StationName.ilike.*${qSafe}*,StationCode.ilike.*${qSafe}*)`;
      const params = new URLSearchParams({
        select: "StationId,StationName,StationCode,State,District,Lat,Long",
        or: orFilter,
        limit: "30",
      });
      apiUrl = `${PROJECT_URL.replace(/\/$/, "")}/rest/v1/Stations?${params.toString()}`;
    } else {
      const params = new URLSearchParams({
        select: "StationId,StationName,StationCode,State,District",
        limit: "10",
      });
      apiUrl = `${PROJECT_URL.replace(/\/$/, "")}/rest/v1/Stations?${params.toString()}`;
    }

    const resp = await fetch(apiUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await resp.text().catch(() => "");
    let data: any[] = [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        data = parsed;
      } else if (Array.isArray(parsed?.data)) {
        data = parsed.data;
      } else {
        data = [];
      }
    } catch {
      data = [];
    }

    // return consistent shape { data: [...] }
    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error("search-stations error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
