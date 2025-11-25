// app/api/train-routes/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";

function todayYMD() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// EX: "DAILY" / "MON,TUE" / "MON,WED" / "ALL"
function dayMatches(runningDays: string | null, dateStr: string) {
  if (!runningDays) return true;

  const idx = new Date(dateStr).getDay();
  const map = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  const code = map[idx];
  const s = runningDays.toUpperCase();

  if (s === "DAILY" || s === "ALL") return true;

  return s.split(/[ ,/]+/).includes(code);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const train = (url.searchParams.get("train") || "").trim();
    const station = (url.searchParams.get("station") || "").trim();
    const date = (url.searchParams.get("date") || "").trim() || todayYMD();

    if (!train || !station) {
      return NextResponse.json(
        { ok: false, error: "missing_params" },
        { status: 400 }
      );
    }

    const supa = serviceClient;
    const trainInt = Number(train);
    const filterValue = Number.isFinite(trainInt) ? trainInt : train;

    // ⚠️ IMPORTANT — column names EXACT
    const { data, error } = await supa
      .from("TrainRoute")
      .select(
        "trainId, trainNumber, trainName, stationFrom, stationTo, runningDays, StnNumber, StationCode, StationName, Arrives, Departs, Stoptime, Distance, Platform, Route, Day"
      )
      .eq("trainNumber", filterValue)
      .eq("StationCode", station.toUpperCase())
      .order("Day", { ascending: true });

    if (error) {
      console.error("train-routes => supabase error:", error);
      return NextResponse.json(
        { ok: false, error: "db_error" },
        { status: 500 }
      );
    }

    const rows = (data || []).filter((r) =>
      dayMatches(r.runningDays, date)
    );

    return NextResponse.json({
      ok: true,
      station,
      train,
      date,
      count: rows.length,
      rows,
    });
  } catch (err) {
    console.error("train-routes => server error:", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
