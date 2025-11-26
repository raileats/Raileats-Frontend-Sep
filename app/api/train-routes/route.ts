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
    const subtotalParam = Number(
      (url.searchParams.get("subtotal") || "0").trim(),
    );

    // cart item names (RestroMenuItems se match ke liye)
    let cartItemNames: string[] = [];
    const itemsRaw = url.searchParams.get("items");
    if (itemsRaw) {
      try {
        const parsed = JSON.parse(itemsRaw);
        if (Array.isArray(parsed)) {
          cartItemNames = parsed
            .map((v) => String(v || "").trim())
            .filter(Boolean);
        }
      } catch {
        cartItemNames = [];
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

    const rows = stationRows;

    // arrival time (Arrives → HH:MM)
    const first = rows[0];
    const rawArr =
      (first.Arrives || first.Departs || "").slice(0, 5) || null;
    const arrivalMinutes = toMinutes(rawArr);
    const arrivalHHMM = fmtHHMM(rawArr);

    // arrival ka exact Date (delivery date + time)
    let arrivalDateObj: Date | null = null;
    if (rawArr) {
      // local time treat kar rahe – server timezone se chalega
      arrivalDateObj = new Date(`${dateParam}T${arrivalHHMM}:00`);
    }

    /* ---------- Restro side checks (WeeklyOff, Holiday, CutOff, MinOrder, Item Timings) ---------- */

    if (restroParam) {
      const restroCodeNum = Number(restroParam);
      const restroFilter = Number.isFinite(restroCodeNum)
        ? restroCodeNum
        : restroParam;

      const { data: restroRows, error: restroErr } = await supa
        .from("RestroMaster")
        .select(
          'RestroCode, StationCode, StationName, "0penTime", "ClosedTime", WeeklyOff, MinimumOrdermValue, CutOffTime, HolidayStartDateTime, HolidayEndDateTime',
        )
        .eq("RestroCode", restroFilter)
        .eq("StationCode", stationCode)
        .limit(1);

      if (restroErr) {
        console.error("restro meta fetch error", restroErr);
      }

      if (restroRows && restroRows.length) {
        const r = restroRows[0] as any;

        // -------- Weekly Off check --------
        if (r.WeeklyOff) {
          const weeklyOffRaw = String(r.WeeklyOff).trim().toUpperCase(); // e.g. SUN
          const d = new Date(dateParam);
          const dayIdx = d.getDay(); // 0..6
          const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
          const dowCode = map[dayIdx];

          if (weeklyOffRaw === dowCode) {
            const dayNameFull = [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ][dayIdx];

            return NextResponse.json(
              {
                ok: false,
                error: "weekly_off",
                meta: {
                  restroCode: r.RestroCode,
                  dayCode: weeklyOffRaw,
                  dayName: dayNameFull,
                },
              },
              { status: 400 },
            );
          }
        }

        // -------- Holiday check --------
        if (arrivalDateObj && (r.HolidayStartDateTime || r.HolidayEndDateTime)) {
          const start =
            r.HolidayStartDateTime && new Date(r.HolidayStartDateTime);
          const end =
            r.HolidayEndDateTime && new Date(r.HolidayEndDateTime);

          if (
            start instanceof Date &&
            !isNaN(start.getTime()) &&
            end instanceof Date &&
            !isNaN(end.getTime())
          ) {
            const arrTs = arrivalDateObj.getTime();
            if (arrTs >= start.getTime() && arrTs <= end.getTime()) {
              return NextResponse.json(
                {
                  ok: false,
                  error: "holiday_closed",
                  meta: {
                    restroCode: r.RestroCode,
                    arrival: arrivalHHMM,
                    holidayStart: start.toISOString(),
                    holidayEnd: end.toISOString(),
                  },
                },
                { status: 400 },
              );
            }
          }
        }

        // Column actually named "0penTime" with zero
        const openRaw: string | null =
          (r["0penTime"] as string | null) ?? null;
        const closeRaw: string | null =
          (r["ClosedTime"] as string | null) ?? null;

        const openMins = toMinutes(openRaw);
        const closeMins = toMinutes(closeRaw);

        // -------- Outlet open/close time vs train arrival --------
        if (
          arrivalMinutes >= 0 &&
          openMins >= 0 &&
          closeMins >= 0 &&
          (arrivalMinutes < openMins || arrivalMinutes > closeMins)
        ) {
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

        // -------- CutOffTime check (sirf same-date booking) --------
        const cutOffMinutes = Number(r.CutOffTime ?? 0); // minutes
        if (
          cutOffMinutes > 0 &&
          arrivalDateObj &&
          dateParam === todayYMD()
        ) {
          const now = new Date();
          const diffMs = arrivalDateObj.getTime() - now.getTime();
          const diffMinutes = Math.floor(diffMs / (60 * 1000)); // train aane tak kitna time bacha

          if (diffMinutes < cutOffMinutes) {
            return NextResponse.json(
              {
                ok: false,
                error: "cutoff_exceeded",
                meta: {
                  restroCode: r.RestroCode,
                  arrival: arrivalHHMM,
                  cutOffMinutes,
                  minutesLeft: diffMinutes,
                },
              },
              { status: 400 },
            );
          }
        }

        // -------- Minimum order check --------
        const minOrder = Number(r.MinimumOrdermValue ?? 0);
        if (
          minOrder > 0 &&
          subtotalParam > 0 &&
          subtotalParam < minOrder
        ) {
          return NextResponse.json(
            {
              ok: false,
              error: "min_order_not_met",
              meta: {
                restroCode: r.RestroCode,
                minOrder,
                subtotal: subtotalParam,
              },
            },
            { status: 400 },
          );
        }

        // -------- Menu item time window check --------
        if (
          arrivalMinutes >= 0 &&
          cartItemNames.length &&
          restroFilter
        ) {
          const { data: menuData, error: menuErr } = await supa
            .from("RestroMenuItems")
            .select("item_name, start_time, end_time")
            .eq("restro_code", restroFilter)
            .in("item_name", cartItemNames);

          if (menuErr) {
            console.error("menu item fetch error", menuErr);
          } else if (menuData && menuData.length) {
            const badItems: {
              name: string;
              start: string;
              end: string;
            }[] = [];

            for (const row of menuData as any[]) {
              const name = String(row.item_name || "").trim();
              const startRaw: string | null =
                (row.start_time as string | null) ?? null;
              const endRaw: string | null =
                (row.end_time as string | null) ?? null;

              const sM = toMinutes(startRaw);
              const eM = toMinutes(endRaw);

              if (
                sM >= 0 &&
                eM >= 0 &&
                (arrivalMinutes < sM || arrivalMinutes > eM)
              ) {
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
