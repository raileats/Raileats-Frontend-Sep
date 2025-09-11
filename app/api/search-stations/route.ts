// app/api/search-stations/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE;
    const PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

    if (!SERVICE_KEY) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE not configured" }, { status: 500 });
    }
    if (!PROJECT_URL) {
      return NextResponse.json({ error: "SUPABASE_URL not configured" }, { status: 500 });
    }

    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();

    let apiUrl: string;
    if (q) {
      const enc = encodeURIComponent(q + "%");
      // ilike on StationName or StationCode
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
    } catch (e) {
      return new NextResponse(text, { status: resp.status });
    }
  } catch (err) {
    console.error("search-stations error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
