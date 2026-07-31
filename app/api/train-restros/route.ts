export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

type AnyRow = Record<string, any>;

/* ================= GENERAL HELPERS ================= */

function formatHaltTime(val: any) {
  if (!val) return "0m";

  const parts = String(val).split(":").map(Number);
  const hh = parts[0] || 0;
  const mm = parts[1] || 0;

  return `${hh * 60 + mm}m`;
}

function normalize(val: any) {
  return String(val ?? "").toUpperCase().trim();
}

function cleanText(val: any) {
  return String(val ?? "").trim();
}

function cleanTrainName(val: any) {
  const v = cleanText(val);

  if (
    !v ||
    v.toLowerCase() === "train" ||
    v.toLowerCase() === "undefined"
  ) {
    return "";
  }

  return v;
}

function isTrue(val: any) {
  if (val === undefined || val === null) {
    return true;
  }

  const s = cleanText(val).toLowerCase();

  return [
    "true",
    "1",
    "active",
    "yes",
    "on",
  ].includes(s);
}

function formatTime(val: any) {
  if (!val) return "00:00";

  return String(val).slice(0, 5);
}

function normalizeRestroCode(value: any) {
  const raw = cleanText(value);

  if (!raw) return "";

  const numericValue = Number(raw);

  if (Number.isFinite(numericValue)) {
    return String(numericValue);
  }

  return raw.toUpperCase();
}

/* ================= CASE-INSENSITIVE FIELD READER ================= */

function getValue(row: AnyRow, possibleKeys: string[]) {
  if (!row || typeof row !== "object") {
    return undefined;
  }

  for (const key of possibleKeys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key];
    }
  }

  const rowKeys = Object.keys(row);

  for (const wantedKey of possibleKeys) {
    const matchedKey = rowKeys.find(
      (rowKey) =>
        rowKey.toLowerCase() === wantedKey.toLowerCase()
    );

    if (matchedKey) {
      return row[matchedKey];
    }
  }

  return undefined;
}

/* ================= FSSAI HELPERS ================= */

function getFssaiRestroCode(row: AnyRow) {
  return normalizeRestroCode(
    getValue(row, [
      "RestroCode",
      "restro_code",
      "restroCode",
      "RestaurantCode",
      "restaurant_code",
    ])
  );
}

function getFssaiExpiryValue(row: AnyRow) {
  return getValue(row, [
    "Expiry",
    "expiry",
    "ExpiryDate",
    "expiry_date",
    "FSSAIExpiry",
    "FSSAIExpiryDate",
    "FssaiExpiry",
    "FssaiExpiryDate",
    "ValidTill",
    "valid_till",
    "ValidUpto",
    "valid_upto",
  ]);
}

function getFssaiStatusValue(row: AnyRow) {
  return getValue(row, [
    "Status",
    "status",
    "FSSAIStatus",
    "FssaiStatus",
    "fssai_status",
    "IsActive",
    "is_active",
    "Active",
    "active",
  ]);
}

function isFssaiStatusActive(value: any) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return true;
  }

  const normalized = cleanText(value).toLowerCase();

  return [
    "active",
    "1",
    "true",
    "yes",
    "on",
    "valid",
    "approved",
  ].includes(normalized);
}

/* ================= EXPIRY DATE PARSER ================= */

function parseExpiryDate(value: any): Date | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      23,
      59,
      59,
      999
    );
  }

  const raw = cleanText(value);

  if (!raw) return null;

  /*
    DD/MM/YYYY
    DD-MM-YYYY
  */
  const indianDateMatch = raw.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
  );

  if (indianDateMatch) {
    const day = Number(indianDateMatch[1]);
    const month = Number(indianDateMatch[2]);
    const year = Number(indianDateMatch[3]);

    const parsed = new Date(
      year,
      month - 1,
      day,
      23,
      59,
      59,
      999
    );

    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }

    return null;
  }

  /*
    YYYY-MM-DD
    YYYY-MM-DDTHH:mm:ss
  */
  const isoDateMatch = raw.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})/
  );

  if (isoDateMatch) {
    const year = Number(isoDateMatch[1]);
    const month = Number(isoDateMatch[2]);
    const day = Number(isoDateMatch[3]);

    const parsed = new Date(
      year,
      month - 1,
      day,
      23,
      59,
      59,
      999
    );

    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }

    return null;
  }

  const fallback = new Date(raw);

  if (Number.isNaN(fallback.getTime())) {
    return null;
  }

  return new Date(
    fallback.getFullYear(),
    fallback.getMonth(),
    fallback.getDate(),
    23,
    59,
    59,
    999
  );
}

/* ================= INDIA CURRENT DATE ================= */

function getIndiaTodayStart() {
  const formatter = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  );

  const parts = formatter.formatToParts(new Date());

  const year = Number(
    parts.find((part) => part.type === "year")?.value
  );

  const month = Number(
    parts.find((part) => part.type === "month")?.value
  );

  const day = Number(
    parts.find((part) => part.type === "day")?.value
  );

  return new Date(
    year,
    month - 1,
    day,
    0,
    0,
    0,
    0
  );
}

/* ================= VALID FSSAI CHECK ================= */

function hasValidFssai(
  fssaiRows: AnyRow[],
  restroCode: any
) {
  const normalizedCode =
    normalizeRestroCode(restroCode);

  if (!normalizedCode) {
    return false;
  }

  const todayStart = getIndiaTodayStart();

  return fssaiRows.some((row) => {
    const rowRestroCode =
      getFssaiRestroCode(row);

    if (rowRestroCode !== normalizedCode) {
      return false;
    }

    const statusValue =
      getFssaiStatusValue(row);

    if (!isFssaiStatusActive(statusValue)) {
      return false;
    }

    const expiryValue =
      getFssaiExpiryValue(row);

    const expiryDate =
      parseExpiryDate(expiryValue);

    if (!expiryDate) {
      return false;
    }

    return (
      expiryDate.getTime() >=
      todayStart.getTime()
    );
  });
}

/* ================= API ================= */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const trainParam =
    searchParams.get("train")?.trim() || "";

  const startDateParam =
    searchParams.get("date")?.trim() || "";

  const boarding =
    searchParams.get("boarding")?.trim() || "";

  const previewMode =
    searchParams.get("preview") === "1";

  try {
    const now = new Date();

    const istNow = new Date(
      now.toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      })
    );

    /* ================= VALIDATE TRAIN ================= */

    if (!trainParam) {
      return NextResponse.json(
        {
          ok: false,
          error: "Train number is required",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    /* ================= FETCH ROUTE ================= */

    const numericTrain =
      parseInt(trainParam, 10) || 0;

    const { data: stopsRows, error: stopsError } =
      await serviceClient
        .from("TrainRoute")
        .select("*")
        .or(
          `trainNumber.eq.${trainParam},trainNumber.eq.${numericTrain}`
        )
        .order("StnNumber", {
          ascending: true,
        });

    if (stopsError) {
      throw stopsError;
    }

    const trainName =
      cleanTrainName(stopsRows?.[0]?.trainName) ||
      cleanTrainName(stopsRows?.[0]?.TrainName) ||
      cleanTrainName(stopsRows?.[0]?.train_name);

    if (!stopsRows?.length) {
      return NextResponse.json(
        {
          ok: true,
          train: {
            trainNumber: trainParam,
            trainName: "",
          },
          stations: [],
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    /* ================= BOARDING ================= */

    const normBoard = normalize(boarding);

    const boardingStation = stopsRows.find(
      (station) =>
        normalize(station.StationCode) === normBoard
    );

    const baseDay = boardingStation
      ? Number(boardingStation.Day || 1)
      : Number(stopsRows[0].Day || 1);

    const boardingIndex = stopsRows.findIndex(
      (station) =>
        normalize(station.StationCode) === normBoard
    );

    const activeRoute =
      boardingIndex !== -1
        ? stopsRows.slice(boardingIndex)
        : stopsRows;

    const stationCodes = Array.from(
      new Set(
        activeRoute
          .map((station) =>
            normalize(station.StationCode)
          )
          .filter(Boolean)
      )
    );

    if (!stationCodes.length) {
      return NextResponse.json(
        {
          ok: true,
          train: {
            trainNumber: trainParam,
            trainName,
          },
          stations: [],
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    /* ================= FETCH STATIONS + RESTROS ================= */

    const [stationsResult, restrosResult] =
      await Promise.all([
        serviceClient
          .from("Stations")
          .select("StationCode, State")
          .in("StationCode", stationCodes),

        serviceClient
          .from("RestroMaster")
          .select("*")
          .in("StationCode", stationCodes),
      ]);

    if (stationsResult.error) {
      throw stationsResult.error;
    }

    if (restrosResult.error) {
      throw restrosResult.error;
    }

    const restrosData =
      restrosResult.data || [];

    /* ================= ACTIVE RESTRO CODES ================= */

    const activeRestros = restrosData.filter(
      (restro: any) =>
        isTrue(
          restro.RaileatsStatus ??
            restro.IsActive
        )
    );

    const activeRestroCodes = Array.from(
      new Set(
        activeRestros
          .map((restro: any) =>
            normalizeRestroCode(
              restro.RestroCode
            )
          )
          .filter(Boolean)
      )
    );

    /* ================= FETCH FSSAI RECORDS ================= */

    let fssaiRows: AnyRow[] = [];

    if (activeRestroCodes.length > 0) {
      /*
        Numeric RestroCode database column ke liye
        numeric values use ki ja rahi hain.
      */
      const numericRestroCodes =
        activeRestroCodes
          .map((code) => Number(code))
          .filter((code) =>
            Number.isFinite(code)
          );

      if (numericRestroCodes.length > 0) {
        const {
          data: fssaiData,
          error: fssaiError,
        } = await serviceClient
          .from("RestroFSSAI")
          .select("*")
          .in(
            "RestroCode",
            numericRestroCodes
          );

        if (fssaiError) {
          throw fssaiError;
        }

        fssaiRows = fssaiData || [];
      }
    }

    /* ================= STATE MAP ================= */

    const stateMap: Record<string, string> = {};

    stationsResult.data?.forEach(
      (station: any) => {
        stateMap[
          normalize(station.StationCode)
        ] = station.State || "";
      }
    );

    /* ================= GROUP VALID RESTAURANTS ================= */

    const groupedRestros: Record<
      string,
      any[]
    > = {};

    activeRestros.forEach((restro: any) => {
      /*
        FSSAI RULE:

        Restaurant tabhi train/PNR result mein aayega jab:
        - RailEats active ho
        - FSSAI record mile
        - FSSAI status active ho
        - Expiry date aaj ya future ki ho
      */
      const validFssai = hasValidFssai(
        fssaiRows,
        restro.RestroCode
      );

      if (!validFssai) {
        return;
      }

      const stationCode =
        normalize(restro.StationCode);

      if (!stationCode) {
        return;
      }

      if (!groupedRestros[stationCode]) {
        groupedRestros[stationCode] = [];
      }

      groupedRestros[stationCode].push(
        restro
      );
    });

    /* ================= FINAL BUILD ================= */

    const finalStations = activeRoute
      .map((station: any) => {
        const code = normalize(
          station.StationCode
        );

        const vendorsRaw =
          groupedRestros[code] || [];

        /*
          Agar station ke sab restaurants ka FSSAI
          expired/inactive hai to poora station result
          list se remove ho jayega.
        */
        if (!vendorsRaw.length) {
          return null;
        }

        /* ================= DATE CALC ================= */

        const currentDay =
          Number(station.Day || 1);

        const dayDiff =
          currentDay - baseDay;

        const arrival = formatTime(
          station.Arrives || "00:00"
        );

        let deliveryDate = "";

        if (!previewMode) {
          if (!startDateParam) {
            return null;
          }

          const serviceDate = new Date(
            `${startDateParam}T00:00:00`
          );

          if (
            Number.isNaN(
              serviceDate.getTime()
            )
          ) {
            return null;
          }

          serviceDate.setDate(
            serviceDate.getDate() + dayDiff
          );

          const arrivalDateTime =
            new Date(serviceDate);

          const [hours, minutes] =
            arrival.split(":").map(Number);

          arrivalDateTime.setHours(
            hours || 0,
            minutes || 0,
            0,
            0
          );

          if (
            arrivalDateTime <= istNow
          ) {
            return null;
          }

          deliveryDate =
            serviceDate.toLocaleDateString(
              "en-GB",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }
            );
        }

        /* ================= VENDORS ================= */

        const validVendors = vendorsRaw
          .map((vendor: any) => {
            const open = formatTime(
              vendor.open_time ??
                vendor.OpenTime
            );

            const close = formatTime(
              vendor.closed_time ??
                vendor.ClosedTime
            );

            return {
              RestroCode:
                vendor.RestroCode,

              RestroName:
                vendor.RestroName,

              RestroRating:
                vendor.RestroRating ||
                "4.2",

              OpenTime:
                open,

              ClosedTime:
                close,

              MinimumOrderValue:
                vendor.MinimumOrderValue ||
                vendor.MinimumOrdermValue ||
                0,

              RestroDisplayPhoto:
                vendor.RestroDisplayPhoto,

              IsPureVeg:
                isTrue(vendor.IsPureVeg)
                  ? 1
                  : 0,

              CutOffTime:
                vendor.CutOffTime || 0,
            };
          })
          .filter(Boolean);

        if (!validVendors.length) {
          return null;
        }

        return {
          StationCode:
            code,

          StationName:
            station.StationName,

          State:
            stateMap[code] || "",

          Arrives:
            arrival,

          Departs:
            station.Departs,

          HaltTime:
            formatHaltTime(
              station.Stoptime ||
                station.StopTime
            ),

          date:
            deliveryDate,

          preview:
            previewMode,

          vendors:
            validVendors,
        };
      })
      .filter(Boolean);

    return NextResponse.json(
      {
        ok: true,

        train: {
          trainNumber:
            trainParam,

          trainName,
        },

        stations:
          finalStations,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error(
      "train-restros error",
      err
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ||
          "Failed to load train restaurants",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
