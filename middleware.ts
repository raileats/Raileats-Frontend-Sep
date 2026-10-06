import { NextRequest, NextResponse } from "next/server";

const NOINDEX_KEYS = new Set([
  "train",
  "trainName",
  "arrival",
  "arrivalTime",
  "deliveryTime",
  "deliveryDate",
  "date",
  "mode",
  "minOrder",
]);

const OLD_HOSTS = new Set(["raileats.in", "www.raileats.in"]);
const NEW_HOST = "www.railswad.com";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hostname = request.nextUrl.hostname.toLowerCase();

  // Permanent domain migration:
  // RailEats -> RailSwad, preserving the same path and query string.
  // /admin is intentionally excluded because it is handled by the
  // existing vercel.json rewrite to the RailEats admin application.
  if (OLD_HOSTS.has(hostname) && !pathname.startsWith("/admin")) {
    const oldStationUrlMatch = pathname.match(
      /^\/stations\/(.+)-food-delivery(\/.*)?$/
    );

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.hostname = NEW_HOST;

    // Preserve the existing station URL migration in the same redirect
    // so Google does not have to follow a redirect chain.
    if (oldStationUrlMatch) {
      const stationSlug = oldStationUrlMatch[1];
      const remainingPath = oldStationUrlMatch[2] || "";
      redirectUrl.pathname =
        `/stations/${stationSlug}-food-delivery-in-train${remainingPath}`;
    }

    return NextResponse.redirect(redirectUrl, 308);
  }

  // Preserve the existing station URL migration for any non-old-domain
  // requests that still use the legacy station path.
  const oldStationUrlMatch = pathname.match(
    /^\/stations\/(.+)-food-delivery(\/.*)?$/
  );

  if (oldStationUrlMatch) {
    const stationSlug = oldStationUrlMatch[1];
    const remainingPath = oldStationUrlMatch[2] || "";
    const redirectUrl = request.nextUrl.clone();

    redirectUrl.pathname =
      `/stations/${stationSlug}-food-delivery-in-train${remainingPath}`;

    return NextResponse.redirect(redirectUrl, 308);
  }

  if (!pathname.startsWith("/stations/")) {
    return NextResponse.next();
  }

  const hasTransactionalQuery = Array.from(
    request.nextUrl.searchParams.keys()
  ).some((key) => NOINDEX_KEYS.has(key));

  if (!hasTransactionalQuery) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.headers.set(
    "X-Robots-Tag",
    "noindex, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
  );

  return response;
}

export const config = {
  // Run the domain migration on all public paths while leaving /admin
  // to the existing Vercel rewrite.
  matcher: ["/((?!admin(?:/|$)).*)"],
};
