// app/api/pnr/[pnr]/route.ts
import { NextResponse } from "next/server";

const PNR_KEY = process.env.RAPIDAPI_KEY;
const PNR_HOST = process.env.RAPIDAPI_HOST;

const ROUTE_KEY = process.env.RAPIDAPI_KEY_ROUTE;
const ROUTE_HOST = process.env.RAPIDAPI_HOST_ROUTE;

const LIVE_KEY = process.env.RAPIDAPI_KEY_LIVE;
const LIVE_HOST = process.env.RAPIDAPI_HOST_LIVE;

const CACHE_MS = 1000 * 60 * 3;
const cache = global.__raileats_pnr_cache__ || new Map();
global.__raileats_pnr_cache__ = cache;

function getCached(k: string) {
  const v = cache.get(k);
  if (!v) return null;
  if (Date.now() - v.ts > CACHE_MS) { cache.delete(k); return null; }
  return v.val;
}
function setCached(k: string, val: any) { cache.set(k, { ts: Date.now(), val }); }

async function safeFetch(url: string, headers: Record<string,string>) {
  const res = await fetch(url, { method: "GET", headers });
  const text = await res.text().catch(() => "");
  try { return { ok: res.ok, status: res.status, json: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, json: text }; }
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
  const raw = String(params.pnr || "").trim();
  const pnr = raw.replace(/\D/g, "");
  if (!pnr || pnr.length < 6) return NextResponse.json({ ok: false, error: "Invalid PNR" }, { status: 400 });

  const cacheKey = `pnr:${pnr}`;
  const cached = getCached(cacheKey);
  if (cached) return NextResponse.json({ ok: true, fromCache: true, ...cached });

  if (!PNR_KEY || !PNR_HOST) {
    return NextResponse.json({ ok: false, error: "Server misconfigured: missing PNR provider env" }, { status: 500 });
  }

  try {
    // 1) PNR fetch
    const pnrUrl = `https://${PNR_HOST}/getPNRStatus/${encodeURIComponent(pnr)}`;
    const pnrRes = await safeFetch(pnrUrl, { "x-rapidapi-host": PNR_HOST, "x-rapidapi-key": PNR_KEY });

    if (!pnrRes.ok) {
      return NextResponse.json({ ok: false, error: "PNR fetch failed", details: pnrRes.json }, { status: 502 });
    }

    const data = pnrRes.json && pnrRes.json.data ? pnrRes.json.data : pnrRes.json;
    const trainNo = data?.trainNumber ?? data?.train_number ?? null;
    const trainName = data?.trainName ?? data?.train_name ?? null;
    const doj = data?.dateOfJourney ?? data?.doj ?? null;
    const board = data?.boardingPoint ?? data?.boarding ?? null;
    const src = data?.sourceStation ?? data?.source ?? null;
    const dest = data?.destinationStation ?? data?.destination ?? null;
    const chartStatus = data?.chartStatus ?? null;
    const passengerList = Array.isArray(data?.passengerList) ? data.passengerList.map(normalizePassenger) : [];

    // 2) Try train route (best-effort)
    let route = null;
    if (ROUTE_KEY && ROUTE_HOST && trainNo) {
      try {
        // try two common path styles in order
        const tryUrls = [
          `https://${ROUTE_HOST}/getTrainRoute/${encodeURIComponent(String(trainNo))}`,
          `https://${ROUTE_HOST}/train-route?train=${encodeURIComponent(String(trainNo))}`
        ];
        for (const u of tryUrls) {
          const r = await safeFetch(u, { "x-rapidapi-host": ROUTE_HOST, "x-rapidapi-key": ROUTE_KEY });
          if (r.ok && r.json) { route = r.json; break; }
        }
      } catch (e) { /* ignore route error */ }
    }

    // 3) Try live running status (best-effort)
    let live = null;
    if (LIVE_KEY && LIVE_HOST && trainNo) {
      try {
        const tryUrls = [
          `https://${LIVE_HOST}/getLiveStatus/${encodeURIComponent(String(trainNo))}`,
          `https://${LIVE_HOST}/live-train-status?train=${encodeURIComponent(String(trainNo))}`
        ];
        for (const u of tryUrls) {
          const r = await safeFetch(u, { "x-rapidapi-host": LIVE_HOST, "x-rapidapi-key": LIVE_KEY });
          if (r.ok && r.json) { live = r.json; break; }
        }
      } catch (e) { /* ignore live error */ }
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
      route,
      live,
    };

    setCached(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (err: any) {
    console.error("PNR handler error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
