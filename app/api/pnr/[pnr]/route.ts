// app/api/pnr/[pnr]/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PNR_KEY =
  process.env.RAPIDAPI_PNR_KEY ||
  process.env.RAPIDAPI_KEY;

const PNR_HOST =
  process.env.RAPIDAPI_PNR_HOST ||
  process.env.RAPIDAPI_HOST ||
  "irctc-indian-railway-pnr-status.p.rapidapi.com";

const CACHE_MS = 1000 * 60 * 3;

type CacheEntry = {
  ts: number;
  val: any;
};

declare global {
  // eslint-disable-next-line no-var
  var __raileats_pnr_cache__: Map<string, CacheEntry> | undefined;
}

const cache =
  global.__raileats_pnr_cache__ ||
  new Map<string, CacheEntry>();

global.__raileats_pnr_cache__ = cache;

function getCached(key: string) {
  const entry = cache.get(key);

  if (!entry) return null;

  if (Date.now() - entry.ts > CACHE_MS) {
    cache.delete(key);
    return null;
  }

  return entry.val;
}

function setCached(key: string, value: any) {
  cache.set(key, {
    ts: Date.now(),
    val: value,
  });
}

function normalizePassenger(p: any) {
  return {
    serial:
      p?.passengerSerialNumber ??
      p?.serial ??
      null,

    quota:
      p?.passengerQuota ??
      p?.quota ??
      null,

    bookingStatus:
      p?.bookingStatus ??
      p?.booking_status ??
      null,

    bookingDetails:
      p?.bookingStatusDetails ??
      p?.booking_details ??
      null,

    bookingBerthNo:
      p?.bookingBerthNo ??
      null,

    currentStatus:
      p?.currentStatus ??
      p?.current_status ??
      null,

    currentDetails:
      p?.currentStatusDetails ??
      p?.current_details ??
      null,

    currentBerthNo:
      p?.currentBerthNo ??
      null,

    currentCoachId:
      p?.currentCoachId ??
      null,

    passengerNationality:
      p?.passengerNationality ??
      null,

    childBerthFlag:
      Boolean(p?.childBerthFlag),
  };
}

function pickData(json: any) {
  return json?.data || json?.result || json;
}

export async function GET(
  _req: Request,
  { params }: { params: { pnr: string } }
) {
  try {
    const pnr = String(params?.pnr || "")
      .trim()
      .replace(/\D/g, "");

    if (!/^[0-9]{10}$/.test(pnr)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Valid 10 digit PNR required",
        },
        { status: 400 }
      );
    }

    const cacheKey = `pnr:${pnr}`;
    const cached = getCached(cacheKey);

    if (cached) {
      return NextResponse.json({
        ok: true,
        fromCache: true,
        ...cached,
      });
    }

    if (!PNR_KEY || !PNR_HOST) {
      return NextResponse.json(
        {
          ok: false,
          error: "Server misconfigured: RapidAPI key/host missing",
        },
        { status: 500 }
      );
    }

    const url = `https://${PNR_HOST}/getPNRStatus/${encodeURIComponent(
      pnr
    )}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": PNR_HOST,
        "x-rapidapi-key": PNR_KEY,
      },
      cache: "no-store",
    });

    const text = await res.text().catch(() => "");
    let json: any = null;

    try {
      json = JSON.parse(text);
    } catch {
      json = {
        rawText: text,
      };
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "PNR API failed",
          status: res.status,
          details: json,
        },
        { status: 502 }
      );
    }

    const data = pickData(json);
    if (
  data?.success === false ||
  data?.status === false ||
  data?.error ||
  String(data?.message || "").toLowerCase().includes("invalid")
) {
  return NextResponse.json(
    {
      ok: false,
      error: "pnr_provider_failed",
      message: data?.message || data?.error || "PNR provider returned failure",
      raw: data,
    },
    { status: 502 }
  );
}

    const passengerRaw =
      data?.passengerList ||
      data?.passengers ||
      data?.PassengerList ||
      [];

    const passengers = Array.isArray(passengerRaw)
      ? passengerRaw.map(normalizePassenger)
      : [];

    const payload = {
      pnr,

      trainNo:
        data?.trainNumber ??
        data?.trainNo ??
        data?.train_number ??
        data?.TrainNo ??
        null,

      trainName:
        data?.trainName ??
        data?.train_name ??
        data?.TrainName ??
        null,

      dateOfJourney:
        data?.dateOfJourney ??
        data?.doj ??
        data?.journeyDate ??
        null,

      boardingPoint:
        data?.boardingPoint ??
        data?.boarding ??
        data?.boardingStation ??
        null,

      source:
        data?.sourceStation ??
        data?.source ??
        data?.from ??
        null,

      destination:
        data?.destinationStation ??
        data?.destination ??
        data?.to ??
        null,

      chartStatus:
        data?.chartStatus ??
        data?.ChartStatus ??
        null,

      passengersCount:
        data?.numberOfpassenger ??
        data?.numberOfPassengers ??
        passengers.length,

      passengers,

      fare: {
        bookingFare:
          data?.bookingFare ??
          null,

        ticketFare:
          data?.ticketFare ??
          null,
      },

      raw: data,
    };

    setCached(cacheKey, payload);

    return NextResponse.json({
      ok: true,
      fromCache: false,
      ...payload,
    });
  } catch (err: any) {
    console.error("PNR handler error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Server error",
      },
      { status: 500 }
    );
  }
}
