// debug-route.ts (replace your current file temporarily)
import { NextResponse } from "next/server";

const KEY = process.env.RAPIDAPI_KEY;
const HOST = process.env.RAPIDAPI_HOST;

function safeJSON(txt: string) {
  try { return JSON.parse(txt); } catch(e) { return txt; }
}

export async function GET(_req: Request, { params }: { params: { pnr: string } }) {
  const pnr = String(params.pnr || "").trim();

  // DEBUG: log key length and host (do NOT print full key)
  console.log("DEBUG: RAPIDAPI_KEY present:", KEY ? true : false, "length:", KEY?.length ?? "undefined");
  console.log("DEBUG: RAPIDAPI_HOST:", HOST);

  if (!pnr || pnr.length < 6) {
    return NextResponse.json({ ok: false, error: "Invalid PNR" }, { status: 400 });
  }

  try {
    if (!KEY || !HOST) {
      console.error("DEBUG: Missing env KEY/HOST");
      return NextResponse.json({ ok: false, error: "Server env missing RAPIDAPI_KEY or RAPIDAPI_HOST" }, { status: 500 });
    }

    const url = `https://${HOST}/getPNRStatus/${encodeURIComponent(pnr)}`;
    console.log("DEBUG: calling upstream url:", url);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": KEY,
        "x-rapidapi-host": HOST,
      },
    });

    const text = await res.text().catch(() => "");
    let parsed = safeJSON(text);
    console.log("DEBUG: upstream status:", res.status, "body:", parsed);

    // If upstream returned 401/403/429 or body indicates not-subscribed, forward as 502 with details
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "PNR fetch failed", details: parsed }, { status: 502 });
    }

    // success branch: try to parse JSON
    const json = typeof parsed === "string" ? safeJSON(parsed) : parsed;
    // return json as-is for now
    return NextResponse.json({ ok: true, raw: json });
  } catch (err: any) {
    console.error("DEBUG: handler error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
