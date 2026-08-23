import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{
    url: "https://www.raileats.in/e-catering",
    lastModified: new Date("2026-08-23T00:00:00+05:30"),
    changeFrequency: "monthly",
    priority: 0.75,
  }];
}
