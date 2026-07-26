import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const oldStationUrlMatch = pathname.match(
    /^\/stations\/(.+)-food-delivery(\/.*)?$/
  );

  if (!oldStationUrlMatch) {
    return NextResponse.next();
  }

  const stationSlug = oldStationUrlMatch[1];
  const remainingPath = oldStationUrlMatch[2] || "";

  const redirectUrl = request.nextUrl.clone();

  redirectUrl.pathname =
    `/stations/${stationSlug}-food-delivery-in-train${remainingPath}`;

  return NextResponse.redirect(redirectUrl, 308);
}

export const config = {
  matcher: ["/stations/:path*"],
};
