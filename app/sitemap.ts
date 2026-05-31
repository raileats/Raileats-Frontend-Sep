import { MetadataRoute } from "next";
import { serviceClient } from "./lib/supabaseServer";

function slugify(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.raileats.in";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/offers`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/vendor`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  /* ================= STATIONS ================= */

  const { data: restros } = await serviceClient
    .from("RestroMaster")
    .select(`
      restro_id,
      restro_name,
      station_code,
      station_name,
      active
    `)
    .eq("active", true);

  const dynamicRoutes: MetadataRoute.Sitemap = [];

  (restros || []).forEach((r: any) => {
    const stationName = slugify(r.station_name || "");
    const stationCode = slugify(r.station_code || "");

    // invalid skip
    if (!stationName || !stationCode) return;

    const stationSlug = `${stationName}-${stationCode}-food-delivery`;

    // station page
    dynamicRoutes.push({
      url: `${baseUrl}/stations/${stationSlug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    });

    // restro page
    const restroSlug = `${r.restro_id}-${slugify(
      r.restro_name || "restaurant"
    )}`;

    dynamicRoutes.push({
      url: `${baseUrl}/stations/${stationSlug}/${restroSlug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    });
  });

  /* ================= REMOVE DUPLICATES ================= */

  const uniqueMap = new Map<string, MetadataRoute.Sitemap[number]>();

  [...staticRoutes, ...dynamicRoutes].forEach((item) => {
    if (
      item.url &&
      !item.url.includes("--food-delivery")
    ) {
      uniqueMap.set(item.url, item);
    }
  });

  return Array.from(uniqueMap.values());
}
