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

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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
  matcher: ["/stations/:path*"],
};
