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

function isActive(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();

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
  if (value === undefined || value === null || value === "") {
    return true;
  }

  const normalized = String(value).trim().toLowerCase();

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

function validDateKey(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));

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

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

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
    parts.map((part) => [part.type, part.value])
  );

  return (
    Number(values.year) * 10000 +
    Number(values.month) * 100 +
    Number(values.day)
  );
}

async function fetchAllRestros() {
  const rows: RestroRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await serviceClient
      .from("RestroMaster")
      .select(
        "RestroCode, RestroName, StationCode, StationName, RaileatsStatus"
      )
      .order("RestroCode", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`RestroMaster fetch failed: ${error.message}`);
    }

    const page = (data || []) as RestroRow[];
    rows.push(...page);

    if (page.length < pageSize) break;
  }

  return rows;
}

async function fetchAllFssaiRows() {
  const rows: FssaiRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await serviceClient
      .from("RestroFSSAI")
      .select("RestroCode, expiry_date, status, created_at")
      .order("RestroCode", { ascending: true })
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`RestroFSSAI fetch failed: ${error.message}`);
    }

    const page = (data || []) as FssaiRow[];
    rows.push(...page);

    if (page.length < pageSize) break;
  }

  return rows;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
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
  ];

  const routeMap = new Map<string, MetadataRoute.Sitemap[number]>();

  for (const route of staticRoutes) {
    routeMap.set(route.url, route);
  }

  try {
    const [restros, fssaiRows] = await Promise.all([
      fetchAllRestros(),
      fetchAllFssaiRows(),
    ]);

    const indiaTodayKey = getIndiaTodayKey();
    const validFssaiCodes = new Set<string>();

    for (const row of fssaiRows) {
      const restroCode = normalizeRestroCode(row.RestroCode);
      const expiryDateKey = parseDateKey(row.expiry_date);

      if (
        restroCode &&
        isActiveFssaiStatus(row.status) &&
        expiryDateKey !== null &&
        expiryDateKey >= indiaTodayKey
      ) {
        validFssaiCodes.add(restroCode);
      }
    }

    for (const restro of restros) {
      const restroCode = normalizeRestroCode(restro.RestroCode);

      if (
        !isActive(restro.RaileatsStatus) ||
        !restroCode ||
        !validFssaiCodes.has(restroCode)
      ) {
        continue;
      }

      const stationName = slugify(restro.StationName);
      const stationCode = slugify(restro.StationCode);
      const restroName = slugify(restro.RestroName);

      if (!stationName || !stationCode || !restroName) {
        continue;
      }

      const stationSlug =
        `${stationName}-${stationCode}-food-delivery-in-train`;

      const restroSlug = `${restroCode}-${restroName}`;

      const stationUrl = `${baseUrl}/stations/${stationSlug}`;
      const restroUrl = `${stationUrl}/${restroSlug}`;

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
  } catch (error) {
    console.error("Sitemap dynamic routes fetch failed:", error);
  }

  return Array.from(routeMap.values()).sort((a, b) =>
    a.url.localeCompare(b.url)
  );
}
