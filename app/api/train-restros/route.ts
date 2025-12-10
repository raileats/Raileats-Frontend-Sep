import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function normalizeCode(v: any) {
  return String(v ?? "").toUpperCase().trim();
}

function matchesRunningDay(runningDays: string | null, dateStr: string) {
  if (!runningDays) return true;
  const d = new Date(dateStr).getDay();
  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const code = map[d];
  const s = runningDays.toUpperCase();

  if (["DAILY", "ALL"].includes(s)) return true;

  const parts = s.split(/[ ,/]+/).map((x) => x.trim());
  return parts.includes(code);
}

function addDaysToIso(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function isActiveRestro(val: any) {
  // normalize active flag
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  if (typeof val === "string") {
    const t = val.trim().toLowerCase();
    if (["0", "false", "no", "n", ""].includes(t)) return false;
    return true;
  }
  return true;
}

// ----------------------------------------------------------------------
// MAIN HANDLER
// ----------------------------------------------------------------------

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const trainParam = (url.searchParams.get("train") || "").trim();
    const dateParam = (url.searchParams.get("date") || "").trim() || todayYMD();
    const boardingParam = (url.searchParams.get("boarding") || "").trim();

    const supa = serviceClient;

    if (!trainParam) {
      return NextResponse.json({ ok: false, error: "missing_train" }, { status: 400 });
    }

    // ------------------------------------------------------------------
    // 1) TrainRoute Fetch (Exact → Partial Fallback)
    // ------------------------------------------------------------------

    let rows: any[] = [];

    const isDigits = /^[0-9]+$/.test(trainParam);
    if (isDigits) {
      const num = Number(trainParam);
      const { data, error } = await supa
        .from("TrainRoute")
        .select("*")
        .eq("trainNumber", num)
        .order("StnNumber", { ascending: true });

      if (!error && data?.length) rows = data;
    }

    // partial
    if (!rows.length) {
      const { data, error } = await supa
        .from("TrainRoute")
        .select("*")
        .or(`trainName.ilike.%${trainParam}%,trainNumber_text.ilike.%${trainParam}%`)
        .order("StnNumber", { ascending: true });

      if (!error && data?.length) rows = data;
    }

    if (!rows.length) {
      return NextResponse.json({ ok: false, error: "train_not_found" }, { status: 404 });
    }

    const trainName = rows[0].trainName ?? "";

    // ------------------------------------------------------------------
    // 2) Filter by running day
    // ------------------------------------------------------------------

    const filteredRows = rows.filter((r) => matchesRunningDay(r.runningDays, dateParam));
    const rowsToUse = filteredRows.length ? filteredRows : rows;

    // gather station codes
    const stationCodes = Array.from(
      new Set(rowsToUse.map((r) => normalizeCode(r.StationCode)).filter(Boolean))
    );

    // ------------------------------------------------------------------
    // 3) Fetch RestroMaster using IN() (Fast Path)
    // ------------------------------------------------------------------

    let restroMap: Record<string, any[]> = {};

    if (stationCodes.length) {
      let restroData: any[] = [];

      try {
        // Try using the column "StationCode" (most likely correct)
        const { data, error } = await supa
          .from("RestroMaster")
          .select("*")
          .in("StationCode", stationCodes);

        if (!error && data) restroData = data;
      } catch (e) {
        console.error("RestroMaster fast IN failed:", e);
      }

      // fallback: fetch all & filter manually
      if (!restroData.length) {
        const { data, error } = await supa.from("RestroMaster").select("*").limit(3000);
        if (!error && data) {
          restroData = data.filter((r) =>
            stationCodes.includes(normalizeCode(r.StationCode))
          );
        }
      }

      // build map
      for (const r of restroData) {
        const sc = normalizeCode(r.StationCode);
        if (!restroMap[sc]) restroMap[sc] = [];
        restroMap[sc].push(r);
      }
    }

    // ------------------------------------------------------------------
    // 4) Compute arrivalDate using "Day"
    // ------------------------------------------------------------------

    let boardingDay: number | null = null;
    if (boardingParam) {
      const b = rowsToUse.find(
        (r) => normalizeCode(r.StationCode) === normalizeCode(boardingParam)
      );
      if (b?.Day != null) boardingDay = Number(b.Day);
    }

    // ------------------------------------------------------------------
    // 5) Build response rows WITH ONLY ACTIVE RESTRO stations
    // ------------------------------------------------------------------

    const finalRows = rowsToUse
      .map((r) => {
        const sc = normalizeCode(r.StationCode);

        // compute arrivalDate based on "Day"
        let arrivalDate = dateParam;
        if (boardingDay != null && r.Day != null) {
          const diff = Number(r.Day) - boardingDay;
          arrivalDate = addDaysToIso(dateParam, diff);
        }

        // vendors
        const rawRestros = restroMap[sc] || [];
        const restros = rawRestros
          .filter((x) => isActiveRestro(x.IsActive ?? x.isActive))
          .map((x) => ({
            restroCode: x.RestroCode,
            restroName: x.RestroName,
            isActive: isActiveRestro(x.IsActive ?? x.isActive),
            openTime: x["0penTime"] ?? null,
            closeTime: x["ClosedTime"] ?? null,
            weeklyOff: x.WeeklyOff ?? null,
            cutOff: x.CutOffTime ?? null,
          }));

        return {
          StationCode: sc,
          StationName: r.StationName,
          StnNumber: r.StnNumber,
          arrivalTime: (r.Arrives || r.Departs || "").slice(0, 5) || null,
          arrivalDate,
          Day: r.Day ?? null,
          restros,
        };
      })
      .filter((row) => row.restros.length > 0); // 🔥 MAIN REQUIREMENT

    // ------------------------------------------------------------------
    // 6) RESPONSE
    // ------------------------------------------------------------------

    return NextResponse.json({
      ok: true,
      train: { trainNumber: trainParam, trainName },
      stations: finalRows, // NOTE: changed from rows → stations
      date: dateParam,
      boarding: boardingParam || null,
    });
  } catch (e) {
    console.error("train-routes error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
