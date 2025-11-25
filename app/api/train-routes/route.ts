// app/api/train-routes/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/train-routes?stationCode=BPL&query=1200
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const stationCodeRaw = searchParams.get("stationCode");
    const queryRaw = searchParams.get("query") || "";

    if (!stationCodeRaw) {
      return NextResponse.json(
        { ok: false, error: "missing_station_code" },
        { status: 400 },
      );
    }

    const stationCode = stationCodeRaw.toUpperCase();
    const q = queryRaw.trim();

    // 🔸 Abhi yahan Supabase / Admin API call **nahi** kar rahe,
    // sirf basic validate karke placeholder response bhej rahe hain.
    // Frontend isko dekhkar "train routes not configured" jaisa message dikha sakta hai.

    return NextResponse.json({
      ok: false,
      error: "train_routes_not_configured",
      info: {
        stationCode,
        query: q,
      },
    });
  } catch (e) {
    console.error("train-routes GET server_error", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }
}
