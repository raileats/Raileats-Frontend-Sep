export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const SERVICE_KEY =
      process.env.SUPABASE_SERVICE_ROLE ??
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SERVICE_KEY;

    const PROJECT_URL =
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

    if (!SERVICE_KEY || !PROJECT_URL) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const qRaw = (url.searchParams.get("q") || "").trim();

    let apiUrl: string;
    if (qRaw) {
      const q = qRaw.replace(/[()'"]/g, ""); // remove illegal chars
      const filter = encodeURIComponent(
        `(StationName.ilike.*${q}*,StationCode.ilike.*${q}*)`
      );
      apiUrl = `${PROJECT_URL}/rest/v1/Stations?select=StationId,StationName,StationCode,State,District&or=${filter}&order=StationName.asc&limit=30`;
    } else {
      apiUrl = `${PROJECT_URL}/rest/v1/Stations?select=StationId,StationName,StationCode,State&limit=10`;
    }

    const resp = await fetch(apiUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      cache: "no-store",
    });

    const data = await resp.json().catch(() => []);
    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error("search-stations error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
