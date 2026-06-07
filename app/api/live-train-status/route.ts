import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeDay(value: string | null) {
  const day = String(value ?? "0").trim();
  if (day === "-1" || day === "0" || day === "1") return day;
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

function buildUrls(host: string, train: string, day: string) {
  const envPath = cleanPath(process.env.LIVE_TRAIN_RAPIDAPI_PATH || "");

  const paths = Array.from(
    new Set([
      envPath,
      "/get-running-status",
      "/running-status",
      "/train-running-status",
      "/live-train-status",
      "/getTrainRunningStatus",
      "/trainRunningStatus",
      `/get-running-status/${train}/${day}`,
      `/running-status/${train}/${day}`,
      `/train-running-status/${train}/${day}`,
    ])
  );

  return paths.map((path) => {
    const providerUrl = new URL(`https://${host}${cleanPath(path)}`);

    providerUrl.searchParams.set("train_number", train);
    providerUrl.searchParams.set("trainNumber", train);
    providerUrl.searchParams.set("train_no", train);
    providerUrl.searchParams.set("trainNo", train);

    providerUrl.searchParams.set("start_day", day);
    providerUrl.searchParams.set("startDay", day);
    providerUrl.searchParams.set("day", day);

    return {
      path: cleanPath(path),
      url: providerUrl,
    };
  });
}

export async function GET(req: Request) {
  try {
    const apiKey = process.env.RAPIDAPI_KEY;
    const rapidHost =
      process.env.LIVE_TRAIN_RAPIDAPI_HOST ||
      "train-running-api.p.rapidapi.com";

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

    const candidates = buildUrls(rapidHost, train, day);
    const attempts: any[] = [];

    for (const candidate of candidates) {
      const res = await fetch(candidate.url.toString(), {
        method: "GET",
        headers: {
          "x-rapidapi-host": rapidHost,
          "x-rapidapi-key": apiKey,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      attempts.push({
        path: candidate.path,
        status: res.status,
        message: json?.message || json?.status || null,
      });

      if (res.ok && json?.status === "success") {
        return NextResponse.json({
          ...json,
          ok: true,
          fromCache: false,
          workingPath: candidate.path,
          requested: {
            train,
            day,
          },
        });
      }
    }

    return NextResponse.json(
      {
        status: "failed",
        ok: false,
        error: "provider_failed",
        message:
          "Koi guessed endpoint path work nahi hua. RapidAPI Code Snippet ka exact --url bhejna padega.",
        attempts,
      },
      { status: 502 }
    );
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
