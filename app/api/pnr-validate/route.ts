// app/api/pnr-validate/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

function cleanPnr(value: string | null) {
  return String(value || "").replace(/\D/g, "").trim();
}

function normalizeDate(value: any) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const ddmmyyyy = raw.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  }

  return raw;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pnr = cleanPnr(url.searchParams.get("pnr"));

    if (!/^[0-9]{10}$/.test(pnr)) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_pnr",
        },
        { status: 400 }
      );
    }

    const origin = url.origin;
    const pnrRes = await fetch(`${origin}/api/pnr/${pnr}`, {
      method: "GET",
      cache: "no-store",
    });

    const json = await pnrRes.json().catch(() => null);

    if (!pnrRes.ok || !json?.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "pnr_lookup_failed",
          details: json,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      pnr,

      train: {
        trainNumber:
          json.trainNo ||
          json.trainNumber ||
          json.raw?.trainNumber ||
          "",

        trainName:
          json.trainName ||
          json.raw?.trainName ||
          "",
      },

      journey: {
        boardingDate: normalizeDate(
          json.dateOfJourney ||
          json.raw?.dateOfJourney ||
          json.raw?.doj
        ),

        boardingStation:
          json.boardingPoint ||
          json.raw?.boardingPoint ||
          json.raw?.boardingStation ||
          "",

        sourceStation:
          json.source ||
          json.raw?.sourceStation ||
          "",

        destinationStation:
          json.destination ||
          json.raw?.destinationStation ||
          "",
      },

      passengers:
        json.passengersCount ||
        json.passengers?.length ||
        0,

      passengersList:
        json.passengers || [],

      chartStatus:
        json.chartStatus || "",

      raw: json.raw || json,
    });
  } catch (e: any) {
    console.error("PNR VALIDATE API ERROR:", e);

    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "server_error",
      },
      { status: 500 }
    );
  }
}
