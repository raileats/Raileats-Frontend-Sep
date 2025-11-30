// app/api/home/train-search/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

/* ---------- ENV + CORS UTILITIES (same style as search-stations) ---------- */

const getEnv = () => {
  return {
    PROJECT_URL:
      process.env.SUPABASE_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      process.env.SUPABASE_PROJECT_URL,
    SERVICE_KEY:
      process.env.SUPABASE_SERVICE_ROLE ??
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SERVICE_KEY,
    FRONTEND_ORIGIN:
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_FRONTEND_URL ??
      "*",
  };
};

const corsHeaders = (origin: string | null = "*") => ({
  "Access-Control-Allow-Origin": origin ?? "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "600",
  "Content-Type": "application/json; charset=utf-8",
});

export async function OPTIONS() {
  const { FRONTEND_ORIGIN } = getEnv();
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(FRONTEND_ORIGIN),
  });
}

/* ----------------- small helpers for HH:MM ----------------- */

function toMinutes(hhmm: string | null | undefined): number {
  if (!hhmm) return -1;
  const [hh, mm] = String(hhmm).trim().slice(0, 5).split(":");
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
  return h * 60 + m;
}

function fmtHHMM(hhmm: string | null | undefined) {
  if (!hhmm) return "";
  const [hh = "00", mm = "00"] = String(hhmm).trim().slice(0, 5).split(":");
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
}

/* -------------------------- GET HANDLER -------------------------- */

export async function GET(request: Request) {
  const { PROJECT_URL, SERVICE_KEY, FRONTEND_ORIGIN } = getEnv();
  const headers = corsHeaders(FRONTEND_ORIGIN ?? "*");

  try {
    if (!PROJECT_URL || !SERVICE_KEY) {
      return NextResponse.json(
        { status: 500, error: "Supabase configuration missing" },
        { status: 500, headers },
      );
    }

    const url = new URL(request.url);
    const trainRaw = (url.searchParams.get("train") || "").trim();

    // agar train number nahi diya → empty result
    if (!trainRaw) {
      return NextResponse.json(
        { status: 200, train: null, stations: [] },
        { status: 200, headers },
      );
    }

    const base = PROJECT_URL.replace(/\/$/, "");

    /* ---------------- 1) TrainRoute se pura route ---------------- */

    const selectRoute = encodeURIComponent(
      "trainNumber,trainName,StationCode,StationName,Arrives,Departs,StnNumber",
    );

    // trainNumber numeric bhi ho sakta hai ya text; REST API me eq. lag jayega
    const routeUrl =
      `${base}/rest/v1/TrainRoute` +
      `?select=${selectRoute}` +
      `&trainNumber=eq.${encodeURIComponent(trainRaw)}` +
      `&order=StnNumber.asc`;

    const routeResp = await fetch(routeUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const routeText = await routeResp.text().catch(() => "");
    if (!routeResp.ok) {
      return NextResponse.json(
        {
          status: 502,
          error: "Supabase TrainRoute request failed",
          details: routeText,
        },
        { status: 502, headers },
      );
    }

    let routeRows: any[] = [];
    try {
      routeRows = JSON.parse(routeText);
    } catch {
      routeRows = [];
    }

    if (!Array.isArray(routeRows) || routeRows.length === 0) {
      return NextResponse.json(
        { status: 404, error: "train_not_found" },
        { status: 404, headers },
      );
    }

    const first = routeRows[0] || {};
    const trainInfo = {
      trainNumber: first.trainNumber ?? trainRaw,
      trainName: first.trainName ?? null,
    };

    const stationCodes: string[] = Array.from(
      new Set(
        routeRows
          .map((r) => String(r.StationCode || "").toUpperCase())
          .filter(Boolean),
      ),
    );

    if (!stationCodes.length) {
      return NextResponse.json(
        { status: 200, train: trainInfo, stations: [] },
        { status: 200, headers },
      );
    }

    /* ---------------- 2) RestroMaster (all stations) ---------------- */

    const inList = `(${stationCodes.join(",")})`; // codes like BPL,NDLS (no quotes needed)
    const selectRestro = encodeURIComponent(
      'RestroCode,StationCode,StationName,"0penTime","ClosedTime",MinimumOrdermValue,status',
    );

    const restroUrl =
      `${base}/rest/v1/RestroMaster` +
      `?select=${selectRestro}` +
      `&StationCode=in.${encodeURIComponent(inList)}`;

    const restroResp = await fetch(restroUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const restroText = await restroResp.text().catch(() => "");
    if (!restroResp.ok) {
      return NextResponse.json(
        {
          status: 502,
          error: "Supabase RestroMaster request failed",
          details: restroText,
        },
        { status: 502, headers },
      );
    }

    let restroRows: any[] = [];
    try {
      restroRows = JSON.parse(restroText);
    } catch {
      restroRows = [];
    }

    /* ---------------- 3) Stations table for State ---------------- */

    const selectStations = encodeURIComponent(
      "StationCode,StationName,State",
    );

    const stationUrl =
      `${base}/rest/v1/Stations` +
      `?select=${selectStations}` +
      `&StationCode=in.${encodeURIComponent(inList)}`;

    const stationResp = await fetch(stationUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const stationText = await stationResp.text().catch(() => "");
    let stationsMeta: any[] = [];
    if (stationResp.ok) {
      try {
        stationsMeta = JSON.parse(stationText);
      } catch {
        stationsMeta = [];
      }
    }

    const stateByCode = new Map<string, { StationName: string; State: string }>();
    for (const s of stationsMeta) {
      const code = String(s.StationCode || "").toUpperCase();
      if (!code) continue;
      stateByCode.set(code, {
        StationName: s.StationName ?? "",
        State: s.State ?? "",
      });
    }

    /* ---------------- 4) Group restros by station ---------------- */

    const restrosByStation = new Map<string, any[]>();
    for (const r of restroRows) {
      const code = String(r.StationCode || "").toUpperCase();
      if (!code) continue;
      const arr = restrosByStation.get(code) || [];
      arr.push(r);
      restrosByStation.set(code, arr);
    }

    /* ---------------- 5) Build station summaries ---------------- */

    const stationSummaries: any[] = [];

    for (const row of routeRows) {
      const stationCode = String(row.StationCode || "").toUpperCase();
      if (!stationCode) continue;

      const arrivalRaw = row.Arrives || row.Departs;
      const arrivalMins = toMinutes(arrivalRaw);
      const arrivalHHMM = fmtHHMM(arrivalRaw);

      if (arrivalMins < 0) continue;

      const restros = restrosByStation.get(stationCode) || [];
      if (!restros.length) continue;

      // filter ACTIVE + timing match
      const activeAtTime: any[] = [];

      for (const r of restros) {
        // status check (if column missing / null → treat as ACTIVE)
        const st = (r.status || "").toString().toUpperCase();
        if (st && st !== "ACTIVE") continue;

        const openMins = toMinutes(r["0penTime"]);
        const closeMins = toMinutes(r["ClosedTime"]);

        if (openMins >= 0 && closeMins >= 0) {
          if (arrivalMins < openMins || arrivalMins > closeMins) {
            continue;
          }
        }
        activeAtTime.push(r);
      }

      if (!activeAtTime.length) continue;

      // min order
      let minOrder: number | null = null;
      for (const r of activeAtTime) {
        const mo = Number(r.MinimumOrdermValue ?? 0);
        if (!Number.isFinite(mo) || mo <= 0) continue;
        if (minOrder === null || mo < minOrder) {
          minOrder = mo;
        }
      }

      const meta = stateByCode.get(stationCode);

      stationSummaries.push({
        StationCode: stationCode,
        StationName:
          (meta && meta.StationName) || row.StationName || "",
        State: meta ? meta.State : "",
        Arrival: arrivalHHMM,
        RestroCount: activeAtTime.length,
        MinOrder: minOrder,
        // yahan future me Veg/Non-Veg category ka summary bhi add kar sakte ho
      });
    }

    return NextResponse.json(
      {
        status: 200,
        train: trainInfo,
        stations: stationSummaries,
      },
      { status: 200, headers },
    );
  } catch (err) {
    console.error("home/train-search error:", err);
    return NextResponse.json(
      { status: 500, error: String(err) },
      { status: 500, headers },
    );
  }
}
