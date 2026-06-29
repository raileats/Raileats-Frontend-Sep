import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.raileats.in";

  return {
    rules: {
      userAgent: "*",
      disallow: [
        "/api/",
        "/admin/",
        "/checkout",
        "/orders",
        "/order-success",
        "/profile",
        "/my-menu",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
