// 🔴 IMPORTANT: force dynamic (Vercel build fix)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

/* ================= IST HELPERS ================= */

// IST current time
function nowIST(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
}

// YYYY-MM-DD in IST
function todayIST(): string {
  return nowIST().toISOString().slice(0, 10);
}

/* ================= API ================= */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pnr = (url.searchParams.get("pnr") || "").trim();

    if (!pnr || pnr.length < 10) {
      return NextResponse.json(
        { ok: false, error: "invalid_pnr" },
        { status: 400 }
      );
    }

    /**
     * 🔴 TEMP MOCK RESPONSE
     * Next step me yahan real IRCTC / PNR API call lagegi
     */
    return NextResponse.json({
      ok: true,
      pnr,
      train: {
        trainNumber: "12612",
        trainName: "MAS GARIB RATH",
      },
      journey: {
        boardingDate: todayIST(), // 🔑 PNR date = food booking date
        boardingStation: "BPL",
        destinationStation: "NZM",
      },
      passengers: 1,
    });

  } catch (e) {
    console.error("PNR VALIDATE API ERROR:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
