import type { MetadataRoute } from "next";
import { serviceClient } from "./lib/supabaseServer";

export const revalidate = 3600;

const baseUrl = "https://www.raileats.in";
const pageSize = 1000;

type RestroRow = {
  RestroCode?: string | number | null;
  RestroName?: string | null;
  StationCode?: string | null;
  StationName?: string | null;
  RaileatsStatus?: unknown;
};

type FssaiRow = {
  RestroCode?: string | number | null;
  expiry_date?: string | null;
  status?: unknown;
  created_at?: string | null;
};

type TrainRouteRow = {
  trainNumber?: string | number | null;
  StationCode?: string | null;
};

function slugify(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeRestroCode(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!raw) return "";

  const numericValue = Number(raw);

  return Number.isFinite(numericValue)
    ? String(numericValue)
    : raw.toUpperCase();
}

function normalizeStationCode(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeTrainNumber(value: unknown) {
  const raw = String(value ?? "").trim();

  return /^\d{5}$/.test(raw) ? raw : "";
}

function isActive(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return (
    value === true ||
    value === 1 ||
    normalized === "1" ||
    normalized === "on" ||
    normalized === "active" ||
    normalized === "true" ||
    normalized === "yes"
  );
}

function isActiveFssaiStatus(value: unknown) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return true;
  }

  const normalized = String(value)
    .trim()
    .toLowerCase();

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

function validDateKey(
  year: number,
  month: number,
  day: number
) {
  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return year * 10000 + month * 100 + day;
}

function parseDateKey(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!raw) return null;

  const isoMatch = raw.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})/
  );

  if (isoMatch) {
    return validDateKey(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3])
    );
  }

  const indianDateMatch = raw.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
  );

  if (indianDateMatch) {
    return validDateKey(
      Number(indianDateMatch[3]),
      Number(indianDateMatch[2]),
      Number(indianDateMatch[1])
    );
  }

  const fallbackDate = new Date(raw);

  if (Number.isNaN(fallbackDate.getTime())) {
    return null;
  }

  return validDateKey(
    fallbackDate.getUTCFullYear(),
    fallbackDate.getUTCMonth() + 1,
    fallbackDate.getUTCDate()
  );
}

function getIndiaTodayKey() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ])
  );

  return (
    Number(values.year) * 10000 +
    Number(values.month) * 100 +
    Number(values.day)
  );
}

function getCreatedAtTime(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!raw) return 0;

  const time = new Date(raw).getTime();

  return Number.isNaN(time) ? 0 : time;
}

async function fetchAllRestros() {
  const rows: RestroRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await serviceClient
      .from("RestroMaster")
      .select(
        "RestroCode, RestroName, StationCode, StationName, RaileatsStatus"
      )
      .order("RestroCode", {
        ascending: true,
      })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(
        `RestroMaster fetch failed: ${error.message}`
      );
    }

    const page = (data || []) as RestroRow[];

    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }
  }

  return rows;
}

async function fetchAllFssaiRows() {
  const rows: FssaiRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await serviceClient
      .from("RestroFSSAI")
      .select(
        "RestroCode, expiry_date, status, created_at"
      )
      .order("RestroCode", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
        nullsFirst: true,
      })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(
        `RestroFSSAI fetch failed: ${error.message}`
      );
    }

    const page = (data || []) as FssaiRow[];

    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }
  }

  return rows;
}

async function fetchAllTrainRouteRows() {
  const rows: TrainRouteRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await serviceClient
      .from("TrainRoute")
      .select("trainNumber, StationCode")
      .order("trainNumber", {
        ascending: true,
      })
      .order("StationCode", {
        ascending: true,
      })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(
        `TrainRoute fetch failed: ${error.message}`
      );
    }

    const page = (data || []) as TrainRouteRow[];

    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }
  }

  return rows;
}

function getLatestFssaiRows(
  rows: FssaiRow[]
) {
  const latestRows = new Map<
    string,
    FssaiRow
  >();

  for (const row of rows) {
    const restroCode = normalizeRestroCode(
      row.RestroCode
    );

    if (!restroCode) {
      continue;
    }

    const currentRow =
      latestRows.get(restroCode);

    if (!currentRow) {
      latestRows.set(restroCode, row);
      continue;
    }

    const currentCreatedAt =
      getCreatedAtTime(
        currentRow.created_at
      );

    const nextCreatedAt =
      getCreatedAtTime(row.created_at);

    if (nextCreatedAt >= currentCreatedAt) {
      latestRows.set(restroCode, row);
    }
  }

  return latestRows;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap =
    [
      {
        url: baseUrl,
        lastModified: now,
        changeFrequency: "daily",
        priority: 1,
      },
      {
        url: `${baseUrl}/order-food-in-train`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.98,
      },
      {
        url: `${baseUrl}/book-food-in-train`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.98,
      },
      {
        url: `${baseUrl}/food-delivery-in-train`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.98,
      },
      {
        url: `${baseUrl}/train-food-delivery`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.96,
      },
      {
        url: `${baseUrl}/best-food-delivery-in-train`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.96,
      },
      {
        url: `${baseUrl}/food-delivery-in-train-from-restaurants`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.95,
      },
      {
        url: `${baseUrl}/pnr-status`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.95,
      },
      {
        url: `${baseUrl}/live-train-status`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.95,
      },
      {
        url: `${baseUrl}/popular-restaurants-train-journey`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.9,
      },
      {
        url: `${baseUrl}/stations`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.92,
      },
      {
        url: `${baseUrl}/offers`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.9,
      },
      {
        url: `${baseUrl}/vendor`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      },
      {
        url: `${baseUrl}/about`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      },
      {
        url: `${baseUrl}/contact`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      },
      {
        url: `${baseUrl}/terms`,
        lastModified: now,
        changeFrequency: "yearly",
        priority: 0.4,
      },
      {
        url: `${baseUrl}/privacy-policy`,
        lastModified: now,
        changeFrequency: "yearly",
        priority: 0.4,
      },
    ];

  const routeMap = new Map<
    string,
    MetadataRoute.Sitemap[number]
  >();

  for (const route of staticRoutes) {
    routeMap.set(route.url, route);
  }

  try {
    const [restros, fssaiRows] =
      await Promise.all([
        fetchAllRestros(),
        fetchAllFssaiRows(),
      ]);

    const indiaTodayKey =
      getIndiaTodayKey();

    const latestFssaiRows =
      getLatestFssaiRows(fssaiRows);

    const eligibleStationCodes =
      new Set<string>();

    for (const restro of restros) {
      const restroCode =
        normalizeRestroCode(
          restro.RestroCode
        );
      const fssai = restroCode
        ? latestFssaiRows.get(restroCode)
        : undefined;
      const expiryDateKey = fssai
        ? parseDateKey(fssai.expiry_date)
        : null;
      const hasExpiredFssai =
        expiryDateKey !== null &&
        expiryDateKey < indiaTodayKey;

      if (
        !isActive(restro.RaileatsStatus) ||
        !restroCode ||
        hasExpiredFssai
      ) {
        continue;
      }

      const stationName = slugify(
        restro.StationName
      );

      const stationCode = slugify(
        restro.StationCode
      );

      const normalizedStationCode =
        normalizeStationCode(
          restro.StationCode
        );

      const restroName = slugify(
        restro.RestroName
      );

      if (
        !stationName ||
        !stationCode ||
        !normalizedStationCode ||
        !restroName
      ) {
        continue;
      }

      eligibleStationCodes.add(
        normalizedStationCode
      );

      const stationSlug =
        `${stationName}-${stationCode}` +
        `-food-delivery-in-train`;

      const restroSlug =
        `${restroCode}-${restroName}`;

      const stationUrl =
        `${baseUrl}/stations/${stationSlug}`;

      const restroUrl =
        `${stationUrl}/${restroSlug}`;

      routeMap.set(stationUrl, {
        url: stationUrl,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.9,
      });

      routeMap.set(restroUrl, {
        url: restroUrl,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }

    try {
      const trainRouteRows =
        await fetchAllTrainRouteRows();

      const eligibleTrainNumbers =
        new Set<string>();

      for (const row of trainRouteRows) {
        const trainNumber =
          normalizeTrainNumber(
            row.trainNumber
          );

        const stationCode =
          normalizeStationCode(
            row.StationCode
          );

        if (
          trainNumber &&
          stationCode &&
          eligibleStationCodes.has(
            stationCode
          )
        ) {
          eligibleTrainNumbers.add(
            trainNumber
          );
        }
      }

      for (const trainNumber of Array.from(
        eligibleTrainNumbers
      )) {
        const trainUrl =
          `${baseUrl}/trains/` +
          `${trainNumber}` +
          `-train-food-delivery-in-train`;

        routeMap.set(trainUrl, {
          url: trainUrl,
          lastModified: now,
          changeFrequency: "daily",
          priority: 0.85,
        });
      }
    } catch (error) {
      console.error(
        "Sitemap train routes fetch failed:",
        error
      );
    }
  } catch (error) {
    console.error(
      "Sitemap dynamic routes fetch failed:",
      error
    );
  }

  return Array.from(
    routeMap.values()
  ).sort((a, b) =>
    a.url.localeCompare(b.url)
  );
}
