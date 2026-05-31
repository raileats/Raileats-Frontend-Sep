import { MetadataRoute } from "next";
import { serviceClient } from "./lib/supabaseServer";

const baseUrl = "https://www.raileats.in";

function slugify(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [
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

  const { data: restros } = await serviceClient
    .from("RestroMaster")
    .select("RestroCode, RestroName, StationCode, StationName");

  for (const r of restros || []) {
    const stationSlug = `${slugify(r.StationName)}-${String(
      r.StationCode || ""
    ).toLowerCase()}-food-delivery`;

    urls.push({
      url: `${baseUrl}/stations/${stationSlug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    });

    urls.push({
      url: `${baseUrl}/stations/${stationSlug}/${r.RestroCode}-${slugify(
        r.RestroName
      )}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  return urls;
}
