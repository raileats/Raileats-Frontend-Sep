import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeDay(value: string | null) {
  const day = String(value ?? "0").trim();

  if (day === "-1" || day === "0" || day === "1") {
    return day;
  }

  return "0";
}

function normalizeTrain(value: string | null) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 5);
}

function cleanPath(value?: string) {
  const path = String(value || "").trim();

  if (!path) return "/";

  return path.startsWith("/") ? path : `/${path}`;
}

function buildProviderUrl(host: string, path: string, train: string, day: string) {
  const providerUrl = new URL(`https://${host}${cleanPath(path)}`);

  /*
    RapidAPI ke actual params unknown hain, isliye same value common names me bhej rahe hain.
    Provider sirf apne required params use karega, extra params usually ignore ho jaate hain.
  */
  providerUrl.searchParams.set("train_number", train);
  providerUrl.searchParams.set("trainNumber", train);
  providerUrl.searchParams.set("train_no", train);
  providerUrl.searchParams.set("trainNo", train);

  providerUrl.searchParams.set("start_day", day);
  providerUrl.searchParams.set("startDay", day);
  providerUrl.searchParams.set("day", day);

  return providerUrl;
}

export async function GET(req: Request) {
  try {
    const apiKey = process.env.RAPIDAPI_KEY;
    const rapidHost =
      process.env.LIVE_TRAIN_RAPIDAPI_HOST ||
      "train-running-api.p.rapidapi.com";

    const rapidPath =
      process.env.LIVE_TRAIN_RAPIDAPI_PATH ||
      "/get-running-status";

    if (!apiKey) {
      return NextResponse.json(
        {
          status: "failed",
          ok: false,
          error: "missing_rapidapi_key",
          message: "RAPIDAPI_KEY env variable missing hai.",
        },
        { status: 500 }
      );
    }

    const url = new URL(req.url);

    const train = normalizeTrain(
      url.searchParams.get("train") ||
        url.searchParams.get("trainNumber") ||
        url.searchParams.get("train_no") ||
        url.searchParams.get("trainNo")
    );

    const day = normalizeDay(
      url.searchParams.get("day") ||
        url.searchParams.get("startDay") ||
        url.searchParams.get("start_day")
    );

    if (!train || train.length < 4) {
      return NextResponse.json(
        {
          status: "failed",
          ok: false,
          error: "invalid_train_number",
          message: "Valid train number required.",
        },
        { status: 400 }
      );
    }

    const providerUrl = buildProviderUrl(rapidHost, rapidPath, train, day);

    const res = await fetch(providerUrl.toString(), {
      method: "GET",
      headers: {
        "x-rapidapi-host": rapidHost,
        "x-rapidapi-key": apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        {
          status: "failed",
          ok: false,
          error: "provider_failed",
          message: json?.message || "Train running provider failed.",
          providerUrl: providerUrl.toString().replace(apiKey, "***"),
          raw: json,
        },
        { status: res.status }
      );
    }

    if (json?.status !== "success") {
      return NextResponse.json(
        {
          status: "failed",
          ok: false,
          error: "train_status_not_found",
          message:
            json?.message ||
            json?.status_message ||
            "Live train status not found.",
          providerUrl: providerUrl.toString(),
          raw: json,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...json,
      ok: true,
      fromCache: false,
      requested: {
        train,
        day,
      },
    });
  } catch (err) {
    console.error("LIVE TRAIN STATUS API ERROR:", err);

    return NextResponse.json(
      {
        status: "failed",
        ok: false,
        error: "server_error",
        message: "Live train status server error.",
      },
      { status: 500 }
    );
  }
}
