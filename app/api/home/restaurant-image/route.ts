import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_HOST = "ygisiztmuzwxpnvhwrmr.supabase.co";
const STORAGE_PREFIX = "/storage/v1/object/public/RestroDisplayPhoto/";
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const THUMBNAIL_WIDTH = 224;
const THUMBNAIL_HEIGHT = 192;

function fallback(request: NextRequest) {
  return NextResponse.redirect(
    new URL("/raileats-header.webp", request.nextUrl.origin),
    307
  );
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("src");

  if (!source) return fallback(request);

  let sourceUrl: URL;

  try {
    sourceUrl = new URL(source);
  } catch {
    return fallback(request);
  }

  if (
    sourceUrl.protocol !== "https:" ||
    sourceUrl.hostname !== SUPABASE_HOST ||
    !sourceUrl.pathname.startsWith(STORAGE_PREFIX)
  ) {
    return fallback(request);
  }

  try {
    const response = await fetch(sourceUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return fallback(request);

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_SOURCE_BYTES) return fallback(request);

    const sourceBytes = Buffer.from(await response.arrayBuffer());
    if (sourceBytes.byteLength > MAX_SOURCE_BYTES) return fallback(request);

    const thumbnail = await sharp(sourceBytes)
      .rotate()
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
        fit: "cover",
        position: "centre",
        withoutEnlargement: true,
      })
      .webp({ quality: 68, effort: 4 })
      .toBuffer();

    return new NextResponse(new Uint8Array(thumbnail), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control":
          "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
        "Content-Length": String(thumbnail.byteLength),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return fallback(request);
  }
}
