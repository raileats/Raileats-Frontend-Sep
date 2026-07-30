import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

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

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function createSlug(value: unknown) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createStationSlug(
  stationName: unknown,
  stationCode: unknown
) {
  const nameSlug = createSlug(stationName);
  const codeSlug = createSlug(stationCode);

  if (nameSlug && codeSlug) {
    return `${nameSlug}-${codeSlug}`;
  }

  return codeSlug || nameSlug;
}

function createRestaurantSlug(
  restroName: unknown,
  restroCode: unknown
) {
  const nameSlug = createSlug(restroName);
  const codeSlug = createSlug(restroCode);

  if (nameSlug && codeSlug) {
    return `${nameSlug}-${codeSlug}`;
  }

  return codeSlug || nameSlug;
}

function normalizeImageUrl(
  value: unknown,
  restroCode: unknown,
  projectUrl: string
) {
  const baseUrl = projectUrl.replace(/\/$/, "");
  const image = cleanText(value);
  const code = cleanText(restroCode);

  const codeImage = code
    ? `${baseUrl}/storage/v1/object/public/${RESTRO_DISPLAY_BUCKET}/${encodeURIComponent(
        code
      )}.webp`
    : FALLBACK_IMAGE;

  if (!image) {
    return codeImage;
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://")
  ) {
    return image;
  }

  if (
    image.startsWith("/") &&
    !image.includes("/storage/v1/object/public/")
  ) {
    return image;
  }

  const cleanImage = image.replace(/^\/+/, "");
  const fileName = cleanImage.split("/").pop() || cleanImage;

  if (cleanImage.startsWith("storage/v1/object/public/")) {
    return `${baseUrl}/${cleanImage}`;
  }

  if (cleanImage.includes("/storage/v1/object/public/")) {
    const storagePath = cleanImage
      .split("/storage/v1/object/public/")
      .pop();

    return storagePath
      ? `${baseUrl}/storage/v1/object/public/${storagePath}`
      : codeImage;
  }

  if (cleanImage.startsWith(`${RESTRO_DISPLAY_BUCKET}/`)) {
    return `${baseUrl}/storage/v1/object/public/${cleanImage}`;
  }

  if (
    cleanImage.startsWith("restro/") ||
    cleanImage.startsWith("Restro/")
  ) {
    return `${baseUrl}/storage/v1/object/public/${RESTRO_DISPLAY_BUCKET}/${fileName}`;
  }

  if (/\.(webp|png|jpg|jpeg)$/i.test(fileName)) {
    return `${baseUrl}/storage/v1/object/public/${RESTRO_DISPLAY_BUCKET}/${fileName}`;
  }

  return codeImage;
}

export async function GET() {
  const { PROJECT_URL, SERVICE_KEY } = getEnv();

  try {
    if (!PROJECT_URL || !SERVICE_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase configuration missing",
          count: 0,
          data: [],
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const baseUrl = PROJECT_URL.replace(/\/$/, "");

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

    /*
     * limit intentionally removed:
     * all active RailEats restaurants will be returned.
     */
    const apiUrl =
      `${baseUrl}/rest/v1/RestroMaster` +
      `?select=${select}` +
      `&RaileatsStatus=eq.1` +
      `&order=RestroName.asc`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const responseText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase request failed",
          status: response.status,
          details: responseText,
          count: 0,
          data: [],
        },
        {
          status: 502,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    let rows: any[] = [];

    try {
      const parsedData = JSON.parse(responseText);
      rows = Array.isArray(parsedData) ? parsedData : [];
    } catch {
      rows = [];
    }

    const activeRestaurants = rows
      .filter((restro) => {
        const restroCode = cleanText(restro?.RestroCode);
        const restroName = cleanText(restro?.RestroName);
        const stationCode = cleanText(restro?.StationCode);

        return restroCode && restroName && stationCode;
      })
      .map((restro) => {
        const restroCode = cleanText(restro.RestroCode);
        const restroName = cleanText(restro.RestroName);
        const stationCode = cleanText(
          restro.StationCode
        ).toUpperCase();
        const stationName = cleanText(restro.StationName);

        const stationSlug = createStationSlug(
          stationName,
          stationCode
        );

        const restroSlug = createRestaurantSlug(
          restroName,
          restroCode
        );

        const menuUrl =
          stationSlug && restroSlug
            ? `/Stations/${encodeURIComponent(
                stationSlug
              )}/${encodeURIComponent(restroSlug)}`
            : "";

        return {
          RestroCode: restro.RestroCode,
          RestroName: restroName,
          StationCode: stationCode,
          StationName: stationName,

          RestroDisplayPhoto: normalizeImageUrl(
            restro.RestroDisplayPhoto,
            restroCode,
            PROJECT_URL
          ),

          RaileatsStatus: restro.RaileatsStatus,
          RestroRating: toNumber(restro.RestroRating),
          MinimumOrderValue: toNumber(
            restro.MinimumOrderValue
          ),

          StationSlug: stationSlug,
          RestroSlug: restroSlug,
          MenuUrl: menuUrl,
        };
      });

    return NextResponse.json(
      {
        success: true,
        count: activeRestaurants.length,
        data: activeRestaurants,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error",
        count: 0,
        data: [],
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
