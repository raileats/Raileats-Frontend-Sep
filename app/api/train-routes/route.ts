// app/api/train-routes/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";

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

    const supa = serviceClient;

    // Basic query: only this station
    let builder = supa
      .from("TrainRoute")
      .select(
        `
        TrainNumber,
        TrainName,
        StationCode,
        Arrives,
        Departs,
        Day
      `,
      )
      .eq("StationCode", stationCode)
      .limit(20);

    // Agar user ne kuchh query diya hai to train number/name pe filter
    if (q) {
      // number jaisa hai?
      if (/^\d+$/.test(q)) {
        builder = builder.ilike("TrainNumber", `${q}%`);
      } else {
        builder = builder.ilike("TrainName", `%${q}%`);
      }
    }

    const { data, error } = await builder;

    if (error) {
      console.error("train-routes GET error", error);
      return NextResponse.json(
        { ok: false, error: "db_error" },
        { status: 500 },
      );
    }

    const trains = (data || []).map((row: any) => ({
      trainNumber: row.TrainNumber ?? row.trainnumber ?? row.train_no ?? "",
      trainName: row.TrainName ?? row.trainname ?? row.train_name ?? "",
      StationCode: row.StationCode ?? stationCode,
      Arrives: row.Arrives ?? row.arrival_time ?? null,
      Departs: row.Departs ?? row.depart_time ?? null,
      Day: row.Day ?? row.day ?? null,
    }));

    return NextResponse.json({ ok: true, trains });
  } catch (e) {
    console.error("train-routes GET server_error", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }
}
