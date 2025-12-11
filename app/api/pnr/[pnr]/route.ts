// app/api/pnr/[pnr]/route.ts
import { NextResponse } from "next/server";

const API_KEY = process.env.INDIANRAIL_API_KEY;

// ---- SIMPLE in-memory cache (dev only). Use Redis/Upstash in prod ----
const CACHE_TTL_MS = 1000 * 60 * 3; // 3 minutes for PNR
const routeCacheTtl = 1000 * 60 * 60 * 6; // 6 hours for train route
const inMemoryCache: Map<string, { ts: number; val: any }> = global.__pnr_cache__ || new Map();
global.__pnr_cache__ = inMemoryCache;

function cacheGet(key: string) {
  const entry = inMemoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > (key.startsWith("route:") ? routeCacheTtl : CACHE_TTL_MS)) {
    inMemoryCache.delete(key);
    return null;
  }
  return entry.val;
}
function cacheSet(key: string, val: any) {
  inMemoryCache.set(key, { ts: Date.now(), val });
}

// ---- helpers to call IndianRailAPI ----
async function fetchJson(url: string) {
  const res = await fetch(url);
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* ignore */ }
  if (!res.ok) {
    const err = new Error(`Upstream ${res.status}: ${res.statusText}`);
    // attach body if available
    (err as any).body = json || text;
    throw err;
  }
  return json;
}

export async function GET(req: Request, { params }: { params: { pnr: string } }) {
  try {
    if (!API_KEY) return NextResponse.json({ ok: false, error: "Server misconfigured: INDIANRAIL_API_KEY missing" }, { status: 500 });

    const pnrRaw = String(params.pnr || "").trim();
    if (!pnrRaw) return NextResponse.json({ ok: false, error: "PNR missing" }, { status: 400 });

    const pnr = pnrRaw.replace(/\D/g, ""); // digits only
    if (pnr.length < 6) return NextResponse.json({ ok: false, error: "Invalid PNR" }, { status: 400 });

    // 1) Check cache
    const cacheKey = `pnr:${pnr}`;
    const cached = cacheGet(cacheKey);
    if (cached) return NextResponse.json({ ok: true, fromCache: true, ...cached });

    // 2) Call PNRCheck endpoint (IndianRailAPI)
    // Example: http://indianrailapi.com/api/v2/PNRCheck/apikey/{apikey}/PNRNumber/{pnr}/Route/1/
    const pnrUrl = `https://indianrailapi.com/api/v2/PNRCheck/apikey/${API_KEY}/PNRNumber/${pnr}/Route/1/`;
    const pnrJson = await fetchJson(pnrUrl);

    // handle common error shapes
    if (!pnrJson || (pnrJson.ResponseCode && String(pnrJson.ResponseCode) !== "200" && String(pnrJson.ResponseCode) !== "200")) {
      return NextResponse.json({ ok: false, error: "PNR API error", details: pnrJson || null }, { status: 502 });
    }

    // parse train number & journey date & passenger list
    const trainNumber = (pnrJson.TrainNumber || pnrJson.TrainNumber || pnrJson.TrainNumber || pnrJson.TrainNumber) ?? pnrJson.TrainNo ?? pnrJson.train_number;
    const trainNoDigits = String(trainNumber || "").replace(/\D/g, "");
    const journeyDateRaw = pnrJson.JourneyDate || pnrJson.journeyDate || pnrJson.Journey_date || null; // often "DD-MM-YYYY"
    // passengers array may be in Passangers / Passengers / Passangers
    const passengers = pnrJson.Passangers || pnrJson.Passengers || pnrJson.Passangers || pnrJson.Passenger || [];

    // 3) parallel: route + live status (if we have train number)
    let routeJson = null;
    let liveJson = null;
    if (trainNoDigits) {
      const routeKey = `route:${trainNoDigits}`;
      const cachedRoute = cacheGet(routeKey);
      if (cachedRoute) {
        routeJson = cachedRoute;
      } else {
        const routeUrl = `https://indianrailapi.com/api/v2/Route/apikey/${API_KEY}/trainnumber/${trainNoDigits}/`;
        try {
          routeJson = await fetchJson(routeUrl);
          if (routeJson && routeJson.ResponseCode && String(routeJson.ResponseCode) === "200") {
            cacheSet(routeKey, routeJson);
          }
        } catch (e) {
          console.warn("Route fetch failed", e);
          routeJson = null;
        }
      }

      // live status — IndianRailAPI expects date in YYYYMMDD or DD-MM-YYYY? many examples use DD-MM-YYYY or YYYYMMDD.
      // We attempt to normalize. If journeyDateRaw exists as DD-MM-YYYY, convert to YYYYMMDD for safety.
      let dateParam = "";
      if (journeyDateRaw && /\d{2}-\d{2}-\d{4}/.test(journeyDateRaw)) {
        const [dd, mm, yyyy] = journeyDateRaw.split("-");
        dateParam = `${yyyy}${mm}${dd}`; // 20190110
      } else {
        // fallback to today in YYYYMMDD
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        dateParam = `${y}${m}${day}`;
      }

      try {
        const liveUrl = `https://indianrailapi.com/api/v2/livetrainstatus/apikey/${API_KEY}/trainnumber/${trainNoDigits}/date/${dateParam}/`;
        liveJson = await fetchJson(liveUrl);
      } catch (e) {
        console.warn("Live status fetch failed", e);
        liveJson = null;
      }
    }

    // Build unified response
    const responsePayload = {
      ok: true,
      pnrRaw: pnrJson,
      trainNumber: trainNoDigits || null,
      trainName: pnrJson.TrainName || pnrJson.TrainName || pnrJson.TrainName || null,
      journeyDate: journeyDateRaw || null,
      passengers: passengers,
      route: routeJson,
      liveStatus: liveJson,
    };

    cacheSet(cacheKey, responsePayload);
    return NextResponse.json(responsePayload);
  } catch (err: any) {
    console.error("PNR handler error", err);
    // handle 429 upstream if present
    if (err?.body && typeof err.body === "object" && err.body.ResponseCode === "429") {
      return NextResponse.json({ ok: false, error: "Upstream rate limited" }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: err?.message || "Server error", details: err?.body || null }, { status: 500 });
  }
}
