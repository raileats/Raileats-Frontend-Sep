import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.raileats.in";

  return {
    rules: {
      userAgent: "*",
      disallow: [
        "/api/",
        "/admin/",
        "/my-menu",
        "/cart",
        "/checkout",
        "/login",
        "/orders",
        "/profile",
        "/wallet",
        "/search",
        "/pnr/",
      ],
    },
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/food/sitemap.xml`,
      `${baseUrl}/e-catering/sitemap.xml`,
    ],
    host: baseUrl,
  };
}
