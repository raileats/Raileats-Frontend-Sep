import type { Metadata } from "next";

const baseUrl = "https://www.raileats.in";

export function privateRouteMetadata(title: string, path: string): Metadata {
  return {
    title,
    alternates: { canonical: `${baseUrl}${path}` },
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    },
  };
}
