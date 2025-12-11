// app/api/pnr/[pnr]/route.ts
import { NextResponse } from "next/server";

const KEY = process.env.RAPIDAPI_KEY!;
const HOST = process.env.RAPIDAPI_HOST!;

export async function GET(_req: Request, { params }: { params: { pnr: string } }) {
  const pnr = params.pnr?.trim();

  if (!pnr || pnr.length < 10) {
    return NextResponse.json({ ok: false, error: "Invalid PNR" }, { status: 400 });
  }

  try {
    const url = `https://${HOST}/getPNRStatus/${pnr}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": KEY,
        "x-rapidapi-host": HOST,
      },
    });

    const json = await response.json();

    if (!response.ok || !json.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "PNR fetch failed",
          details: json,
        },
        { status: 500 }
      );
    }

    const d = json.data;

    return NextResponse.json({
      ok: true,
      pnr: d.pnrNumber || pnr,
      trainNo: d.trainNumber,
      trainName: d.trainName,
      dateOfJourney: d.dateOfJourney,
      boardingPoint: d.boardingPoint,
      class: d.class,
      passengersCount: d.numberOfPassenger,
      chartStatus: d.chartStatus,
      source: d.sourceStation,
      destination: d.destinationStation,
      raw: d,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
