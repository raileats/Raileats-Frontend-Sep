import { MetadataRoute } from "next";
import { serviceClient } from "./lib/supabaseServer";

const baseUrl = "https://www.raileats.in";

function slugify(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isActive(value: any) {
  const v = String(value ?? "").trim().toLowerCase();

  return (
    value === true ||
    value === 1 ||
    v === "1" ||
    v === "on" ||
    v === "active" ||
    v === "true" ||
    v === "yes"
  );
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
  ];

  const { data: restros } = await serviceClient
    .from("RestroMaster")
    .select("RestroCode, RestroName, StationCode, StationName, RaileatsStatus");

  const dynamicRoutes: MetadataRoute.Sitemap = [];

  for (const r of restros || []) {
    if (!isActive(r.RaileatsStatus)) continue;

    const stationName = slugify(r.StationName || "");
    const stationCode = slugify(r.StationCode || "");
    const restroName = slugify(r.RestroName || "");

    if (!stationName || !stationCode || !r.RestroCode || !restroName) {
      continue;
    }

    const stationSlug = `${stationName}-${stationCode}-food-delivery`;
    const restroSlug = `${r.RestroCode}-${restroName}`;

    dynamicRoutes.push({
      url: `${baseUrl}/stations/${stationSlug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    });

    dynamicRoutes.push({
      url: `${baseUrl}/stations/${stationSlug}/${restroSlug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  const uniqueMap = new Map<string, MetadataRoute.Sitemap[number]>();

  [...staticRoutes, ...dynamicRoutes].forEach((item) => {
    if (item.url && !item.url.includes("--food-delivery")) {
      uniqueMap.set(item.url, item);
    }
  });

  return Array.from(uniqueMap.values());
}
