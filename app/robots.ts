import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.raileats.in";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/pnr-status",
          "/live-train-status",
          "/order-food-in-train",
          "/book-food-in-train",
          "/food-delivery-in-train",
          "/train-food-delivery",
          "/best-food-delivery-in-train",
          "/food-delivery-in-train-from-restaurants",
          "/stations",
        ],
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
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
