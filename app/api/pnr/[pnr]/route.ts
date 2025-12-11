// app/api/pnr/[pnr]/route.ts
import { NextResponse } from "next/server";

const RAPID_KEY = process.env.RAPIDAPI_KEY;
const RAPID_HOST = process.env.RAPIDAPI_HOST;

// optional route provider (if you add another RapidAPI provider for train route)
const ROUTE_KEY = process.env.RAPIDAPI_KEY_ROUTE;
const ROUTE_HOST = process.env.RAPIDAPI_HOST_ROUTE;

const CACHE_MS = 1000 * 60 * 3;
const cache = global.__raileats_pnr_cache__ || new Map();
global.__raileats_pnr_cache__ = cache;

function getCached(k: string) {
  const e = cache.get(k);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_MS) { cache.delete(k); return null; }
  return e.val;
}
function setCached(k: string, v: any) { cache.set(k, { ts: Date.now(), val: v }); }

async function safeFetch(url: string, headers: Record<string,string>) {
  const res = await fetch(url, { method: "GET", headers });
  const txt = await res.text().catch(() => "");
  try { return { ok: res.ok, status: res.status, json: JSON.parse(txt) }; }
  catch { return { ok: res.ok, status: res.status, json: txt }; }
}

function normalizePassenger(p: any) {
  return {
    serial: p?.passengerSerialNumber ?? null,
    quota: p?.passengerQuota ?? null,
    bookingStatus: p?.bookingStatus ?? null,
    bookingDetails: p?.bookingStatusDetails ?? null,
    bookingBerthNo: p?.bookingBerthNo ?? null,
    currentStatus: p?.currentStatus ?? null,
    currentDetails: p?.currentStatusDetails ?? null,
    currentBerthNo: p?.currentBerthNo ?? null,
    currentCoachId: p?.currentCoachId ?? null,
    passengerNationality: p?.passengerNationality ?? null,
    childBerthFlag: !!p?.childBerthFlag,
  };
}

export async function GET(_req: Request, { params }: { params: { pnr: string } }) {
  const rawPnr = String(params.pnr || "").trim();
  const pnr = rawPnr.replace(/\D/g, "");
  if (!pnr || pnr.length < 6) {
    return NextResponse.json({ ok: false, error: "Invalid PNR" }, { status: 400 });
  }

  const cacheKey = `pnr:${pnr}`;
  const cached = getCached(cacheKey);
  if (cached) return NextResponse.json({ ok: true, fromCache: true, ...cached });

  if (!RAPID_KEY || !RAPID_HOST) {
    return NextResponse.json({ ok: false, error: "Server misconfigured: RAPIDAPI env missing" }, { status: 500 });
  }

  try {
    // 1) fetch PNR from RapidAPI provider (example path)
    const pnrUrl = `https://${RAPID_HOST}/getPNRStatus/${encodeURIComponent(pnr)}`;
    const pnrRes = await safeFetch(pnrUrl, { "x-rapidapi-host": RAPID_HOST, "x-rapidapi-key": RAPID_KEY });

    if (!pnrRes.ok) {
      // if provider explicitly says "not subscribed", surface upstream details
      const details = pnrRes.json;
      return NextResponse.json({ ok: false, error: "PNR fetch failed", details }, { status: 502 });
    }

    // provider returns wrapper: { success:true, data: { ... } }
    const data = (pnrRes.json && pnrRes.json.data) ? pnrRes.json.data : pnrRes.json;

    // parse main fields (best-effort)
    const trainNo = data?.trainNumber ?? data?.train_number ?? null;
    const trainName = data?.trainName ?? data?.train_name ?? null;
    const doj = data?.dateOfJourney ?? data?.doj ?? null;
    const board = data?.boardingPoint ?? data?.boarding ?? null;
    const src = data?.sourceStation ?? data?.source ?? null;
    const dest = data?.destinationStation ?? data?.destination ?? null;
    const chartStatus = data?.chartStatus ?? null;
    const passengerList = Array.isArray(data?.passengerList) ? data.passengerList.map(normalizePassenger) : [];

    // optional: fetch route (if ROUTE_HOST provided)
    let route = null;
    if (ROUTE_KEY && ROUTE_HOST && trainNo) {
      try {
        const routeUrl = `https://${ROUTE_HOST}/getTrainRoute/${encodeURIComponent(String(trainNo))}`;
        const r = await safeFetch(routeUrl, { "x-rapidapi-host": ROUTE_HOST, "x-rapidapi-key": ROUTE_KEY });
        if (r.ok) route = r.json;
      } catch (e) { /* ignore */ }
    }

    const payload = {
      ok: true,
      pnr,
      trainNo,
      trainName,
      dateOfJourney: doj,
      boardingPoint: board,
      source: src,
      destination: dest,
      chartStatus,
      passengersCount: data?.numberOfpassenger ?? data?.numberOfPassengers ?? passengerList.length,
      passengers: passengerList,
      fare: { bookingFare: data?.bookingFare ?? null, ticketFare: data?.ticketFare ?? null },
      raw: data,
      route, // may be null if not fetched
    };

    setCached(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (err: any) {
    console.error("PNR handler error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
