import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

function slugify(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildStationSlug(stationName: unknown, stationCode: unknown) {
  const nameSlug = slugify(stationName);
  const codeSlug = slugify(stationCode);

  if (nameSlug && codeSlug) return `${nameSlug}-${codeSlug}-food-delivery`;
  if (nameSlug) return `${nameSlug}-food-delivery`;
  if (codeSlug) return `${codeSlug}-food-delivery`;

  return "";
}

function buildRestroSlug(restroName: unknown, restroCode: unknown) {
  const nameSlug = slugify(restroName);
  const codeSlug = slugify(restroCode);

  if (nameSlug && codeSlug) return `${nameSlug}-${codeSlug}`;
  if (nameSlug) return nameSlug;
  if (codeSlug) return codeSlug;

  return "";
}

function normalizeImageUrl(value: unknown, restroCode: unknown, projectUrl: string) {
  const image = String(value ?? "").trim();
  const code = String(restroCode ?? "").trim();
  const baseUrl = projectUrl.replace(/\/$/, "");

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  if (image) {
    const cleanImage = image.replace(/^\/+/, "");

    if (cleanImage.includes("/")) {
      return `${baseUrl}/storage/v1/object/public/${cleanImage}`;
    }

    return `${baseUrl}/storage/v1/object/public/RestroDisplayPhoto/${encodeURIComponent(
      cleanImage
    )}`;
  }

  if (code) {
    return `${baseUrl}/storage/v1/object/public/RestroDisplayPhoto/${encodeURIComponent(
      code
    )}.webp`;
  }

  return "/raileats-logo.png";
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
        "Rating",
        "MinimumOrderValue",
      ].join(",")
    );

    const apiUrl = `${PROJECT_URL.replace(
      /\/$/,
      ""
    )}/rest/v1/RestroMaster?select=${select}&RaileatsStatus=eq.1&limit=10`;

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
      .filter((restro) => restro.RestroCode && restro.RestroName)
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
        RestroRating: restro.RestroRating ?? restro.Rating ?? null,
        Rating: restro.Rating ?? restro.RestroRating ?? null,
        MinimumOrderValue: restro.MinimumOrderValue ?? null,
        StationSlug: buildStationSlug(restro.StationName, restro.StationCode),
        RestroSlug: buildRestroSlug(restro.RestroName, restro.RestroCode),
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
        error:
          error instanceof Error ? error.message : "Unexpected server error",
        data: [],
      },
      { status: 500 }
    );
  }
}
