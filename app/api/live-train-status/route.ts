import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LIVE_TRAIN_HOST = "train-running-api.p.rapidapi.com";
const LIVE_TRAIN_PATH = "/api/LiveTrainApi/";

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

function dayLabel(day: string) {
  if (day === "-1") return "Yesterday";
  if (day === "1") return "Tomorrow";
  return "Today";
}

function friendlyProviderMessage(day: string, rawMessage?: string) {
  if (day === "-1") {
    return "Yesterday ka running status provider se available nahi hai. Today select karke try karein.";
  }

  if (rawMessage?.toLowerCase().includes("http error")) {
    return "Train running provider abhi response nahi de raha. Thodi der baad try karein.";
  }

  return rawMessage || `${dayLabel(day)} ka live train status available nahi hai.`;
}

export async function GET(req: Request) {
  try {
    const apiKey = process.env.RAPIDAPI_KEY;
    const rapidHost = process.env.LIVE_TRAIN_RAPIDAPI_HOST || LIVE_TRAIN_HOST;

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
        url.searchParams.get("trainnumber") ||
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

    const providerUrl = new URL(`https://${rapidHost}${LIVE_TRAIN_PATH}`);
    providerUrl.searchParams.set("trainnumber", train);
    providerUrl.searchParams.set("start_day", day);

    const res = await fetch(providerUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": rapidHost,
        "x-rapidapi-key": apiKey,
      },
      cache: "no-store",
    });

    const json = await res.json().catch(() => null);
    const providerMessage = String(json?.message || json?.status_message || "");

    if (!res.ok) {
      return NextResponse.json({
        status: "failed",
        ok: false,
        error: "provider_failed",
        message: friendlyProviderMessage(day, providerMessage),
        providerStatus: res.status,
        requested: {
          train,
          day,
          dayLabel: dayLabel(day),
        },
        raw: json,
      });
    }

    if (json?.status !== "success") {
      return NextResponse.json({
        status: "failed",
        ok: false,
        error: "train_status_not_found",
        message: friendlyProviderMessage(day, providerMessage),
        requested: {
          train,
          day,
          dayLabel: dayLabel(day),
        },
        raw: json,
      });
    }

    return NextResponse.json({
      ...json,
      ok: true,
      fromCache: false,
      requested: {
        train,
        day,
        dayLabel: dayLabel(day),
      },
    });
  } catch (err) {
    console.error("LIVE TRAIN STATUS API ERROR:", err);

    return NextResponse.json({
      status: "failed",
      ok: false,
      error: "server_error",
      message: "Live train status server error. Thodi der baad try karein.",
    });
  }
}
