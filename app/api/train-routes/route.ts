import { NextResponse } from "next/server";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY!;
const RAPIDAPI_HOST = "indian-railways-data-api.p.rapidapi.com";

export async function GET(
  _req: Request,
  { params }: { params: { trainNo: string } }
) {
  const trainNo = String(params.trainNo || "").trim();

  if (!trainNo) {
    return NextResponse.json(
      { ok: false, error: "train_no_required" },
      { status: 400 }
    );
  }

  try {
    const url = `https://${RAPIDAPI_HOST}/api/v1/trains/${trainNo}/schedule`;

    const res = await fetch(url, {
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json(
        { ok: false, error: "route_fetch_failed", details: txt },
        { status: 502 }
      );
    }

    const json = await res.json();

    const stations =
      json?.data?.stations?.map((s: any) => ({
        stationCode: s.stationCode,
        stationName: s.stationName,
        arrivalTime: s.arrivalTime,
        departureTime: s.departureTime,
        haltTime: s.haltTime,
        day: s.day,
        distance: s.distance,
        platform: s.platform || null,
      })) || [];

    return NextResponse.json({
      ok: true,
      trainNo,
      trainName: json?.data?.trainName || null,
      stationsCount: stations.length,
      stations,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "server_error" },
      { status: 500 }
    );
  }
}
