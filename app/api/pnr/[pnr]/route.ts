import { NextResponse } from "next/server";

const KEY = process.env.RAPIDAPI_KEY!;
const HOST = process.env.RAPIDAPI_HOST!;

export async function GET(_req: Request, { params }: { params: { pnr: string } }) {
  const pnr = params.pnr?.trim();

  if (!pnr || pnr.length !== 10) {
    return NextResponse.json({ ok: false, error: "Invalid PNR" }, { status: 400 });
  }

  try {
    // 1) Call RapidAPI PNR
    const url = `https://${HOST}/getPNRStatus/${pnr}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": KEY,
        "x-rapidapi-host": HOST,
      }
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "PNR fetch failed", details: data }, { status: 500 });
    }

    // 2) Extract useful data for frontend
    const trainNo = data?.train_number;
    const trainName = data?.train_name;
    const passengers = data?.passengers;
    const doj = data?.doj;

    return NextResponse.json({
      ok: true,
      pnr,
      trainNo,
      trainName,
      doj,
      passengers,
      raw: data,
    });

  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
