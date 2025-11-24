import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 👇 isko true karoge to pura site maintenance pe chala jayega
const MAINTENANCE_MODE = true;

export function middleware(req: NextRequest) {
  if (!MAINTENANCE_MODE) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();

  // maintenance page khud ko allow karo, warna infinite loop
  if (url.pathname.startsWith("/maintenance")) {
    return NextResponse.next();
  }

  url.pathname = "/maintenance";
  return NextResponse.rewrite(url);
}

// sab routes pe apply
export const config = {
  matcher: "/:path*",
};
