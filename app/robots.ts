import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        "/checkout",
        "/profile",
        "/orders",
      ],
    },
    sitemap: "https://www.raileats.in/sitemap.xml",
  };
}
