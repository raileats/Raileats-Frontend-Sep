// DEBUG handler — paste & redeploy once
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { pnr: string } }) {
  const pnr = String(params.pnr || "").trim();
  console.log("DEBUG -- PNR REQUESTED:", pnr);

  // debug environment vars (do NOT log full key)
  const key = process.env.RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_HOST;
  console.log("DEBUG -- RAPIDAPI_KEY present:", !!key, "length:", key?.length ?? "undefined");
  console.log("DEBUG -- RAPIDAPI_HOST:", host);

  if (!pnr) return NextResponse.json({ ok: false, error: "PNR missing" }, { status: 400 });

  try {
    if (!key || !host) {
      console.error("DEBUG: Missing RAPIDAPI env");
      return NextResponse.json({ ok: false, error: "Server env missing RAPIDAPI_KEY or RAPIDAPI_HOST" }, { status: 500 });
    }

    const url = `https://${host}/getPNRStatus/${encodeURIComponent(pnr)}`;
    console.log("DEBUG: Calling upstream:", url);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-host": host,
        "x-rapidapi-key": key,
      },
    });

    const text = await res.text().catch(() => "");
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    console.log("DEBUG: Upstream status:", res.status, "body:", body);

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "PNR fetch failed", details: body }, { status: 502 });
    }

    return NextResponse.json({ ok: true, raw: body });
  } catch (e: any) {
    console.error("DEBUG: Handler error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
