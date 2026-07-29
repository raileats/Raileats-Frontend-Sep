import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(
    new URL("/raileats-header.webp", request.nextUrl.origin),
    307
  );
}
