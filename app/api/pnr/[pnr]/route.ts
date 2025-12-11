// app/api/pnr/[pnr]/route.ts
import { NextResponse } from "next/server";

const PNR_KEY = process.env.RAPIDAPI_KEY;
const PNR_HOST = process.env.RAPIDAPI_HOST;

const ROUTE_API = process.env.ROUTE_API; // e.g. https://api.irailway.app/train-route?trainNo=
const LIVE_API = process.env.LIVE_API;   // e.g. https://api.irailway.app/live-status?trainNo=

const CACHE_MS = 1000 * 60 * 3;
type CacheEntry = { ts: number; val: any };
declare global {
  // attach to global to persist between cold starts in Vercel
  // eslint-disable-next-line no-var
  var __raileats_pnr_cache__: Map<string, CacheEntry> | undefined;
}
const cache: Map<string, CacheEntry> = global.__raileats_pnr_cache__ || new Map();
global.__raileats_pnr_cache__ = cache;

function getCached(k: string) {
  const e = cache.get(k);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_MS) {
    cache.delete(k);
    return null;
  }
  return e.val;
}
function setCached(k: string, v: any) {
  cache.set(k, { ts: Date.now(), val: v });
}

async function safeFetchJson(url: string) {
  try {
    const res = await fetch(url, { method: "GET" });
    const text = await res.text().catch(() => "");
    try {
      return { ok: res.ok, status: res.status, json: JSON.parse(text) };
    } catch {
      return { ok: res.ok, status: res.status, json: text };
    }
  } catch (e) {
    return { ok: false, status: 0, json: { error: String(e) } };
  }
}

function normalizePassenger(p: any) {
  return {
    serial: p?.passengerSerialNumber ?? p?.serial ?? null,
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

  if (!PNR_KEY || !PNR_HOST) {
    return NextResponse.json(
      { ok: false, error: "Server misconfigured: RAPIDAPI_KEY or RAPIDAPI_HOST missing" },
      { status: 500 }
    );
  }

  try {
    // 1) Fetch PNR from RapidAPI provider
    const pnrUrl = `https://${PNR_HOST}/getPNRStatus/${encodeURIComponent(pnr)}`;
    const pnrRes = await fetch(pnrUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-host": PNR_HOST,
        "x-rapidapi-key": PNR_KEY,
      } as Record<string,string>,
    });

    const pnrText = await pnrRes.text().catch(() => "");
    let pnrJson: any;
    try { pnrJson = JSON.parse(pnrText); } catch { pnrJson = pnrText; }

    if (!pnrRes.ok) {
      return NextResponse.json({ ok: false, error: "PNR fetch failed", details: pnrJson }, { status: 502 });
    }

    // Normalize data
    const data = pnrJson?.data ?? pnrJson;
    const trainNoRaw = data?.trainNumber ?? data?.train_number ?? null;
    const trainNo = trainNoRaw ? String(trainNoRaw).trim() : null;
    const trainName = data?.trainName ?? data?.train_name ?? null;
    const doj = data?.dateOfJourney ?? data?.doj ?? null;
    const board = data?.boardingPoint ?? data?.boarding ?? null;
    const src = data?.sourceStation ?? data?.source ?? null;
    const dest = data?.destinationStation ?? data?.destination ?? null;
    const chartStatus = data?.chartStatus ?? null;
    const passengerList = Array.isArray(data?.passengerList) ? data.passengerList.map(normalizePassenger) : [];

    // 2) Fetch route using free API if configured (best-effort)
    let route: any = null;
    if (ROUTE_API && trainNo) {
      try {
        const url = `${ROUTE_API}${encodeURIComponent(trainNo)}`;
        const r = await safeFetchJson(url);
        if (r.ok) route = r.json;
        else route = { error: "route_fetch_failed", details: r.json };
      } catch (e) {
        route = { error: String(e) };
      }
    }

    // 3) Fetch live status using free API if configured (best-effort)
    let live: any = null;
    if (LIVE_API && trainNo) {
      try {
        const url = `${LIVE_API}${encodeURIComponent(trainNo)}`;
        const l = await safeFetchJson(url);
        if (l.ok) live = l.json;
        else live = { error: "live_fetch_failed", details: l.json };
      } catch (e) {
        live = { error: String(e) };
      }
    }

    // Prepare payload
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
      route,
      live,
    };

    setCached(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (err: any) {
    console.error("PNR handler error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Server error" }, { status: 500 });
  }
}
