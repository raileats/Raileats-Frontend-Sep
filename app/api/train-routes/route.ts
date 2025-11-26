// app/api/train-routes/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

type TrainRouteRow = {
  trainId: number;
  trainNumber: number | null;
  trainName: string | null;
  stationFrom: string | null;
  stationTo: string | null;
  runningDays: string | null;
  StnNumber: number | null;
  StationCode: string | null;
  StationName: string | null;
  Arrives: string | null;
  Departs: string | null;
  Stoptime: string | null;
  Distance: string | null;
  Platform: string | null;
  Route: number | null;
  Day: number | null;
};

function todayYMD() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// runningDays text ko filhaal sirf "DAILY" / "MON,TUE" type basic check se handle kar rahe hain
function matchesRunningDay(runningDays: string | null, dateStr: string) {
  if (!runningDays) return true; // agar data nahi hai to allow kar do

  const dayIndex = new Date(dateStr).getDay(); // 0=Sun..6=Sat
  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const code = map[dayIndex];

  const s = runningDays.toUpperCase().trim();
  if (s === "DAILY" || s === "ALL") return true;

  return s.split(/[ ,/]+/).includes(code); // e.g. "MON,TUE,WED"
}

function toMinutes(hhmm: string | null | undefined): number {
  if (!hhmm) return -1;
  const [hh, mm] = String(hhmm).trim().split(":");
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
  return h * 60 + m;
}

function fmtHHMM(hhmm: string | null | undefined) {
  if (!hhmm) return "";
  const [hh = "00", mm = "00"] = String(hhmm).split(":");
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const trainParam = (url.searchParams.get("train") || "").trim();
    const stationParam = (url.searchParams.get("station") || "").trim();
    const dateParam =
      (url.searchParams.get("date") || "").trim() || todayYMD();
    const restroParam = (url.searchParams.get("restro") || "").trim();

    // items: JSON array of item names (optional)
    let itemNames: string[] = [];
    const itemsParam = url.searchParams.get("items");
    if (itemsParam) {
      try {
        const parsed = JSON.parse(itemsParam);
        if (Array.isArray(parsed)) {
          itemNames = parsed
            .map((x) => String(x || "").trim())
            .filter((x) => x.length > 0);
        }
      } catch {
        // ignore parse error
      }
    }

    if (!trainParam || !stationParam) {
      return NextResponse.json(
        { ok: false, error: "missing_params" },
        { status: 400 },
      );
    }

    const stationCode = stationParam.toUpperCase();
    const supa = serviceClient;

    // column ka naam "trainNumber" hai
    const trainNumAsNumber = Number(trainParam);
    const trainFilterValue = Number.isFinite(trainNumAsNumber)
      ? trainNumAsNumber
      : trainParam;

    // 1) Poore train ka route laao (sab stations)
    const { data, error } = await supa
      .from("TrainRoute")
      .select(
        "trainId, trainNumber, trainName, stationFrom, stationTo, runningDays, StnNumber, StationCode, StationName, Arrives, Departs, Stoptime, Distance, Platform, Route, Day",
      )
      .eq("trainNumber", trainFilterValue)
      .order("StnNumber", { ascending: true });

    if (error) {
      console.error("train-routes GET supabase error", error);
      return NextResponse.json(
        { ok: false, error: "db_error" },
        { status: 500 },
      );
    }

    const allRows: TrainRouteRow[] = (data || []) as any[];

    // ---- Train hi nahi mila ----
    if (!allRows.length) {
      return NextResponse.json(
        { ok: false, error: "train_not_found" },
        { status: 404 },
      );
    }

    // ---- Running-day filter ----
    const dayRows = allRows.filter((r) =>
      matchesRunningDay(r.runningDays, dateParam),
    );
    if (!dayRows.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "not_running_on_date",
          meta: { train: trainParam, date: dateParam },
        },
        { status: 400 },
      );
    }

    // ---- Station check (kya iss route me hai?) ----
    const stationRows = dayRows.filter(
      (r) => (r.StationCode || "").toUpperCase() === stationCode,
    );

    if (!stationRows.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "station_not_on_route",
          meta: {
            train: trainParam,
            stationCode,
          },
        },
        { status: 400 },
      );
    }

    // yahi rows UI ko bhejenge
    const rows = stationRows;

    // arrival time (Arrives → HH:MM)
    const first = rows[0];
    const rawArr =
      (first.Arrives || first.Departs || "").slice(0, 5) || null;
    const arrivalMinutes = toMinutes(rawArr);
    const arrivalHHMM = fmtHHMM(rawArr);

    // ---- Restro + Menu time checks (agar restro param diya hai) ----
    if (restroParam) {
      const restroCodeNum = Number(restroParam);
      const restroFilter = Number.isFinite(restroCodeNum)
        ? restroCodeNum
        : restroParam;

      // 1) Outlet open/close window
      const { data: restroRows, error: restroErr } = await supa
        .from("RestroMaster")
        .select(
          // dhyaan rahe: "0penTime" me zero hai, O nahi
          'RestroCode, StationCode, StationName, "0penTime", "ClosedTime"',
        )
        .eq("RestroCode", restroFilter)
        .eq("StationCode", stationCode)
        .limit(1);

      if (restroErr) {
        console.error("restro meta fetch error", restroErr);
      }

      if (restroRows && restroRows.length) {
        const r = restroRows[0] as any;

        const openRaw: string | null =
          (r["0penTime"] as string | null) ?? null;
        const closeRaw: string | null =
          (r["ClosedTime"] as string | null) ?? null;

        const openMins = toMinutes(openRaw);
        const closeMins = toMinutes(closeRaw);

        if (arrivalMinutes >= 0 && openMins >= 0 && closeMins >= 0) {
          let within = false;

          if (closeMins >= openMins) {
            // normal same-day window: e.g. 10:00 → 23:30
            within =
              arrivalMinutes >= openMins && arrivalMinutes <= closeMins;
          } else {
            // overnight window: e.g. 22:22 → 11:59 (next day)
            // allowed: [open..24:00) ∪ [00:00..close]
            within =
              arrivalMinutes >= openMins || arrivalMinutes <= closeMins;
          }

          if (!within) {
            return NextResponse.json(
              {
                ok: false,
                error: "restro_time_mismatch",
                meta: {
                  restroCode: r.RestroCode,
                  arrival: arrivalHHMM,
                  restroOpen: fmtHHMM(openRaw),
                  restroClose: fmtHHMM(closeRaw),
                  stationCode,
                },
              },
              { status: 400 },
            );
          }
        }
      }

      // 2) ITEM-WISE menu time window (RestroMenuItems)
      if (itemNames.length && arrivalMinutes >= 0) {
        const { data: menuRows, error: menuErr } = await supa
          .from("RestroMenuItems")
          .select("item_name, start_time, end_time")
          .eq("restro_code", restroFilter)
          .in("item_name", itemNames);

        if (menuErr) {
          console.error("menu time fetch error", menuErr);
        } else if (menuRows && menuRows.length) {
          const badItems: {
            name: string;
            start: string;
            end: string;
          }[] = [];

          for (const row of menuRows as any[]) {
            const name: string = row.item_name || "";
            const startRaw: string | null = row.start_time ?? null;
            const endRaw: string | null = row.end_time ?? null;

            const startMins = toMinutes(startRaw);
            const endMins = toMinutes(endRaw);

            // agar times hi nahi diye gaye, to item always-available treat karo
            if (startMins < 0 || endMins < 0) continue;

            let within = false;
            if (endMins >= startMins) {
              // normal window
              within =
                arrivalMinutes >= startMins &&
                arrivalMinutes <= endMins;
            } else {
              // overnight window
              within =
                arrivalMinutes >= startMins ||
                arrivalMinutes <= endMins;
            }

            if (!within) {
              badItems.push({
                name,
                start: fmtHHMM(startRaw),
                end: fmtHHMM(endRaw),
              });
            }
          }

          if (badItems.length) {
            return NextResponse.json(
              {
                ok: false,
                error: "item_time_mismatch",
                meta: {
                  arrival: arrivalHHMM,
                  items: badItems,
                },
              },
              { status: 400 },
            );
          }
        }
      }
    }

    // ---- Success response ----
    return NextResponse.json({
      ok: true,
      rows,
      meta: {
        stationCode,
        stationName: first.StationName,
        train: trainParam,
        date: dateParam,
        count: rows.length,
        arrival: arrivalHHMM,
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
