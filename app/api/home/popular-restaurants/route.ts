import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RESTRO_DISPLAY_BUCKET = "RestroDisplayPhoto";
const FALLBACK_IMAGE = "/raileats-logo.png";

const getEnv = () => ({
  PROJECT_URL:
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_PROJECT_URL,
  SERVICE_KEY:
    process.env.SUPABASE_SERVICE_ROLE ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY,
});

function normalizeImageUrl(value: unknown, restroCode: unknown, projectUrl: string) {
  const baseUrl = projectUrl.replace(/\/$/, "");
  const image = String(value ?? "").trim();
  const code = String(restroCode ?? "").trim();

  const codeImage = code
    ? `${baseUrl}/storage/v1/object/public/${RESTRO_DISPLAY_BUCKET}/${encodeURIComponent(
        code
      )}.webp`
    : FALLBACK_IMAGE;

  if (!image) return codeImage;

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  if (image.startsWith("/") && !image.includes("/storage/v1/object/public/")) {
    return image;
  }

  const cleanImage = image.replace(/^\/+/, "");
  const fileName = cleanImage.split("/").pop() || cleanImage;

  if (cleanImage.startsWith("storage/v1/object/public/")) {
    return `${baseUrl}/${cleanImage}`;
  }

  if (cleanImage.includes("/storage/v1/object/public/")) {
    const storagePath = cleanImage.split("/storage/v1/object/public/").pop();
    return storagePath
      ? `${baseUrl}/storage/v1/object/public/${storagePath}`
      : codeImage;
  }

  if (cleanImage.startsWith(`${RESTRO_DISPLAY_BUCKET}/`)) {
    return `${baseUrl}/storage/v1/object/public/${cleanImage}`;
  }

  if (cleanImage.startsWith("restro/") || cleanImage.startsWith("Restro/")) {
    return `${baseUrl}/storage/v1/object/public/${RESTRO_DISPLAY_BUCKET}/${fileName}`;
  }

  if (/\.(webp|png|jpg|jpeg)$/i.test(fileName)) {
    return `${baseUrl}/storage/v1/object/public/${RESTRO_DISPLAY_BUCKET}/${fileName}`;
  }

  return codeImage;
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export async function GET() {
  const { PROJECT_URL, SERVICE_KEY } = getEnv();

  try {
    if (!PROJECT_URL || !SERVICE_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase configuration missing",
          data: [],
        },
        { status: 500 }
      );
    }

    const select = encodeURIComponent(
      [
        "RestroCode",
        "RestroName",
        "StationCode",
        "StationName",
        "RestroDisplayPhoto",
        "RaileatsStatus",
        "RestroRating",
        "MinimumOrderValue",
      ].join(",")
    );

    const apiUrl = `${PROJECT_URL.replace(
      /\/$/,
      ""
    )}/rest/v1/RestroMaster?select=${select}&RaileatsStatus=eq.1&order=RestroCode.asc&limit=10`;

    const response = await fetch(apiUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase request failed",
          status: response.status,
          details: text,
          data: [],
        },
        { status: 502 }
      );
    }

    let rows: any[] = [];

    try {
      rows = JSON.parse(text);
    } catch {
      rows = [];
    }

    const activeRestaurants = (Array.isArray(rows) ? rows : [])
      .filter((restro) => restro?.RestroCode && restro?.RestroName)
      .map((restro) => ({
        RestroCode: restro.RestroCode,
        RestroName: restro.RestroName,
        StationCode: restro.StationCode ?? "",
        StationName: restro.StationName ?? "",
        RestroDisplayPhoto: normalizeImageUrl(
          restro.RestroDisplayPhoto,
          restro.RestroCode,
          PROJECT_URL
        ),
        RaileatsStatus: restro.RaileatsStatus,
        RestroRating: toNumber(restro.RestroRating),
        MinimumOrderValue: toNumber(restro.MinimumOrderValue),
      }));

    return NextResponse.json(
      {
        success: true,
        count: activeRestaurants.length,
        data: activeRestaurants,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unexpected server error",
        data: [],
      },
      { status: 500 }
    );
  }
}
