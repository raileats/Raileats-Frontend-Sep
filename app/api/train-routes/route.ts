// app/api/train-routes/route.ts  (updated)
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

function matchesRunningDay(runningDays: string | null, dateStr: string) {
  if (!runningDays) return true;
  const dayIndex = new Date(dateStr).getDay(); // 0=Sun..6=Sat
  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const code = map[dayIndex];
  const s = runningDays.toUpperCase().trim();
  if (s === "DAILY" || s === "ALL") return true;
  return s.split(/[ ,/]+/).includes(code);
}

function toMinutes(hhmm: string | null | undefined): number {
  if (!hhmm) return -1;
  const parts = String(hhmm).trim().split(":");
  const hh = Number(parts[0] || 0);
  const mm = Number(parts[1] || 0);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return -1;
  return hh * 60 + mm;
}

function fmtHHMM(hhmm: string | null | undefined) {
  if (!hhmm) return "";
  const [hh = "00", mm = "00"] = String(hhmm).split(":");
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
}

function checkCutoffSameDay(deliveryYMD: string, arrivalHHMM: string, cutOffMinutes: number) {
  const today = todayYMD();
  if (deliveryYMD !== today) return { allowed: true, remainingMinutes: Infinity };
  const now = new Date();
  const [ah, am] = arrivalHHMM.split(":").map((v) => Number(v) || 0);
  const arrival = new Date();
  arrival.setHours(ah, am, 0, 0);
  const diffMs = arrival.getTime() - now.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const allowed = diffMin >= cutOffMinutes;
  const remainingMinutes = diffMin - cutOffMinutes;
  return { allowed, remainingMinutes };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const trainParam = (url.searchParams.get("train") || "").trim();
    const stationParam = (url.searchParams.get("station") || "").trim();
    const dateParam = (url.searchParams.get("date") || "").trim() || todayYMD();
    const restroParam = (url.searchParams.get("restro") || "").trim();
    const subtotalParam = Number((url.searchParams.get("subtotal") || "0").trim());

    let cartItemNames: string[] = [];
    const itemsRaw = url.searchParams.get("items");
    if (itemsRaw) {
      try {
        const parsed = JSON.parse(itemsRaw);
        if (Array.isArray(parsed)) cartItemNames = parsed.map((v) => String(v || "").trim()).filter(Boolean);
      } catch {
        cartItemNames = [];
      }
    }

    if (!trainParam) {
      return NextResponse.json({ ok: false, error: "missing_train" }, { status: 400 });
    }

    const supa = serviceClient;
    const trainNumAsNumber = Number(trainParam);
    const trainFilterValue = Number.isFinite(trainNumAsNumber) ? trainNumAsNumber : trainParam;

    const { data: routeData, error: routeErr } = await supa
      .from("TrainRoute")
      .select(
        "trainId, trainNumber, trainName, stationFrom, stationTo, runningDays, StnNumber, StationCode, StationName, Arrives, Departs, Stoptime, Distance, Platform, Route, Day",
      )
      .eq("trainNumber", trainFilterValue)
      .order("StnNumber", { ascending: true });

    if (routeErr) {
      console.error("train-routes supabase error", routeErr);
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    const allRows: TrainRouteRow[] = (routeData || []) as any[];

    if (!allRows.length) {
      return NextResponse.json({ ok: false, error: "train_not_found" }, { status: 404 });
    }

    // --- full-route (no station param) flow: return route + attach restros per station
    if (!stationParam) {
      const rowsForDate = allRows.filter((r) => matchesRunningDay(r.runningDays, dateParam));
      const rowsToReturn = rowsForDate.length ? rowsForDate : allRows;

      const stationCodes = Array.from(new Set(rowsToReturn.map((r) => (String(r.StationCode || "").toUpperCase()).trim()))).filter(Boolean);

      // Try bulk fetch first (fast)
      let restroRows: any[] = [];
      try {
        const q = supa
          .from("RestroMaster")
          .select(
            'RestroCode, StationCode, StationName, RestroName, RestroDisplayPhoto, "0penTime", "ClosedTime", WeeklyOff, MinimumOrdermValue, CutOffTime, isActive',
          )
          .in("StationCode", stationCodes);

        // prefer only active outlets - if you DON'T want this, remove the next line
        q.eq("isActive", true);

        const { data: rr, error: rrErr } = await q;
        if (rrErr) {
          console.error("RestroMaster bulk fetch error", rrErr);
        } else {
          restroRows = rr || [];
        }
      } catch (e) {
        console.error("restro bulk fetch exception", e);
      }

      // fallback: if bulk returned nothing for some stations, query per-station case-insensitive (handles mismatch)
      const restrosByStation = new Map<string, any[]>();
      for (const r of restroRows) {
        const code = String(r.StationCode || "").toUpperCase().trim();
        const list = restrosByStation.get(code) || [];
        list.push(r);
        restrosByStation.set(code, list);
      }

      // find station codes that are missing restros and try individual query (case-insensitive ilike)
      const missing = stationCodes.filter((sc) => !(restrosByStation.has(sc) && restrosByStation.get(sc).length > 0));
      if (missing.length) {
        // do them in small batches to avoid query limits
        for (const sc of missing) {
          try {
            const { data: rr2, error: rr2Err } = await supa
              .from("RestroMaster")
              .select(
                'RestroCode, StationCode, StationName, RestroName, RestroDisplayPhoto, "0penTime", "ClosedTime", WeeklyOff, MinimumOrdermValue, CutOffTime, isActive',
              )
              // case-insensitive fallback
              .ilike("StationCode", sc)
              .eq("isActive", true)
              .order("RestroCode", { ascending: true });

            if (!rr2Err && rr2 && rr2.length) {
              restrosByStation.set(sc, rr2);
            } else {
              // also try trimmed lowercase match (rare)
              const { data: rr3 } = await supa
                .from("RestroMaster")
                .select(
                  'RestroCode, StationCode, StationName, RestroName, RestroDisplayPhoto, "0penTime", "ClosedTime", WeeklyOff, MinimumOrdermValue, CutOffTime, isActive',
                )
                .ilike("StationCode", sc.toLowerCase())
                .eq("isActive", true)
                .order("RestroCode", { ascending: true });

              if (rr3 && rr3.length) restrosByStation.set(sc, rr3);
            }
          } catch (e) {
            console.error("restro per-station fetch error for", sc, e);
          }
        }
      }

      // build mapped rows
      const mapped = rowsToReturn.map((r) => {
        const sc = (String(r.StationCode || "").toUpperCase()).trim();
        const restros = (restrosByStation.get(sc) || []).map((x: any) => ({
          restroCode: x.RestroCode,
          restroName: x.RestroName ?? x.RestroDisplayName ?? null,
          RestroDisplayPhoto: x.RestroDisplayPhoto ?? null,
          openTime: x["0penTime"] ?? null,
          closeTime: x["ClosedTime"] ?? null,
          WeeklyOff: x.WeeklyOff ?? null,
          MinimumOrdermValue: x.MinimumOrdermValue ?? null,
          CutOffTime: x.CutOffTime ?? null,
          isActive: typeof x.isActive !== "undefined" ? Boolean(x.isActive) : true,
        }));

        return {
          StnNumber: r.StnNumber,
          StationCode: sc,
          StationName: r.StationName ?? null,
          Arrives: r.Arrives ?? null,
          Departs: r.Departs ?? null,
          Platform: r.Platform ?? null,
          Distance: r.Distance ?? null,
          runningDays: r.runningDays ?? null,
          Day: typeof r.Day !== "undefined" && r.Day !== null ? Number(r.Day) : null,
          restros,
          restroCount: restros.length,
          raw: r,
        };
      });

      const trainName = allRows[0].trainName ?? null;
      return NextResponse.json({ ok: true, train: { trainNumber: trainParam, trainName }, rows: mapped }, { status: 200 });
    }

    // ---------- station-specific flow ----------
    const stationCode = stationParam.toUpperCase();

    const dayRows = allRows.filter((r) => matchesRunningDay(r.runningDays, dateParam));
    if (!dayRows.length) {
      return NextResponse.json({ ok: false, error: "not_running_on_date", meta: { train: trainParam, date: dateParam } }, { status: 400 });
    }

    const stationRows = dayRows.filter((r) => (String(r.StationCode || "").toUpperCase()).trim() === stationCode);
    if (!stationRows.length) {
      return NextResponse.json({ ok: false, error: "station_not_on_route", meta: { train: trainParam, stationCode } }, { status: 400 });
    }

    const rows = stationRows;
    const first = rows[0];
    const rawArr = ((first.Arrives || first.Departs || "") as string).slice(0, 5) || null;
    const arrivalMinutes = toMinutes(rawArr);
    const arrivalHHMM = fmtHHMM(rawArr);

    let arrivalDateObj: Date | null = null;
    if (arrivalHHMM) arrivalDateObj = new Date(`${dateParam}T${arrivalHHMM}:00`);

    // same validations for restroParam if provided (weekly off, holiday, cutoff, minorder, item times)
    if (restroParam) {
      const restroCodeNum = Number(restroParam);
      const restroFilter = Number.isFinite(restroCodeNum) ? restroCodeNum : restroParam;

      const { data: restroRows, error: restroErr } = await supa
        .from("RestroMaster")
        .select('RestroCode, StationCode, StationName, RestroName, "0penTime", "ClosedTime", WeeklyOff, MinimumOrdermValue, CutOffTime')
        .eq("RestroCode", restroFilter)
        .eq("StationCode", stationCode)
        .limit(1);

      if (restroErr) console.error("restro meta fetch error", restroErr);

      if (restroRows && restroRows.length) {
        const r = restroRows[0] as any;

        if (r.WeeklyOff) {
          const weeklyOffRaw = String(r.WeeklyOff).trim().toUpperCase();
          const d = new Date(dateParam);
          const dayIdx = d.getDay();
          const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
          const dowCode = map[dayIdx];
          if (weeklyOffRaw === dowCode) {
            const dayNameFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayIdx];
            return NextResponse.json({ ok: false, error: "weekly_off", meta: { restroCode: r.RestroCode, dayCode: weeklyOffRaw, dayName: dayNameFull } }, { status: 400 });
          }
        }

        if (arrivalDateObj) {
          const { data: holidayRows, error: holidayErr } = await supa
            .from("RestroHoliday")
            .select("restro_code, start_at, end_at, comment")
            .eq("restro_code", restroFilter);

          if (holidayErr) console.error("RestroHoliday fetch error", holidayErr);
          else if (holidayRows && holidayRows.length) {
            const arrTs = arrivalDateObj.getTime();
            for (const h of holidayRows as any[]) {
              const hsRaw = h.start_at;
              const heRaw = h.end_at;
              if (!hsRaw || !heRaw) continue;
              const hs = new Date(hsRaw);
              const he = new Date(heRaw);
              if (isNaN(hs.getTime()) || isNaN(he.getTime())) continue;
              if (arrTs >= hs.getTime() && arrTs <= he.getTime()) {
                return NextResponse.json({ ok: false, error: "holiday_closed", meta: { restroCode: r.RestroCode, arrival: arrivalHHMM, holidayStart: hs.toISOString(), holidayEnd: he.toISOString(), comment: h.comment || null } }, { status: 400 });
              }
            }
          }
        }

        const openRaw: string | null = (r["0penTime"] as string | null) ?? null;
        const closeRaw: string | null = (r["ClosedTime"] as string | null) ?? null;
        const openMins = toMinutes(openRaw);
        const closeMins = toMinutes(closeRaw);

        if (arrivalMinutes >= 0 && openMins >= 0 && closeMins >= 0 && (arrivalMinutes < openMins || arrivalMinutes > closeMins)) {
          return NextResponse.json({ ok: false, error: "restro_time_mismatch", meta: { restroCode: r.RestroCode, arrival: arrivalHHMM, restroOpen: fmtHHMM(openRaw), restroClose: fmtHHMM(closeRaw), stationCode } }, { status: 400 });
        }

        const cutOffMinutes = Number(r.CutOffTime || 0);
        if (cutOffMinutes > 0 && arrivalHHMM) {
          const { allowed, remainingMinutes } = checkCutoffSameDay(dateParam, arrivalHHMM, cutOffMinutes);
          if (!allowed) {
            return NextResponse.json({ ok: false, error: "cutoff_exceeded", meta: { arrival: arrivalHHMM, cutOffMinutes, remainingMinutes } }, { status: 400 });
          }
        }

        const minOrder = Number(r.MinimumOrdermValue ?? 0);
        if (minOrder > 0 && subtotalParam > 0 && subtotalParam < minOrder) {
          return NextResponse.json({ ok: false, error: "min_order_not_met", meta: { restroCode: r.RestroCode, minOrder, subtotal: subtotalParam } }, { status: 400 });
        }

        if (arrivalMinutes >= 0 && cartItemNames.length && restroFilter) {
          const { data: menuData, error: menuErr } = await supa
            .from("RestroMenuItems")
            .select("item_name, start_time, end_time")
            .eq("restro_code", restroFilter)
            .in("item_name", cartItemNames);

          if (menuErr) console.error("menu item fetch error", menuErr);
          else if (menuData && menuData.length) {
            const badItems: { name: string; start: string; end: string }[] = [];
            for (const row of menuData as any[]) {
              const name = String(row.item_name || "").trim();
              const sM = toMinutes(row.start_time);
              const eM = toMinutes(row.end_time);
              if (sM >= 0 && eM >= 0 && (arrivalMinutes < sM || arrivalMinutes > eM)) {
                badItems.push({ name, start: fmtHHMM(row.start_time), end: fmtHHMM(row.end_time) });
              }
            }
            if (badItems.length) {
              return NextResponse.json({ ok: false, error: "item_time_mismatch", meta: { arrival: arrivalHHMM, items: badItems } }, { status: 400 });
            }
          }
        }
      }
    }

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
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
