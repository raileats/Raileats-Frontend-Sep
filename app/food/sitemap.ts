import type { MetadataRoute } from "next";

const baseUrl = "https://www.raileats.in";
const slugs = [
  "pure-veg-food-in-train",
  "jain-food-in-train",
  "biryani-in-train",
  "pizza-in-train",
  "thali-in-train",
  "south-indian-food-in-train",
  "chinese-food-in-train",
  "breakfast-in-train",
  "non-veg-food-in-train",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-08-23T00:00:00+05:30");
  return [
    { url: `${baseUrl}/food`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    ...slugs.map((slug) => ({
      url: `${baseUrl}/food/${slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.82,
    })),
  ];
}
