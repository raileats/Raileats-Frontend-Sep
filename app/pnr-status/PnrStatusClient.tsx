"use client";

import { useMemo, useState } from "react";

type PnrPassenger = {
  serial?: number;
  bookingStatus?: string | null;
  bookingDetails?: string | null;
  currentStatus?: string | null;
  currentDetails?: string | null;
  currentCoachId?: string | null;
  currentBerthNo?: string | number | null;
};

type PnrResult = {
  ok: boolean;
  pnr: string;
  trainNo?: string | null;
  trainName?: string | null;
  dateOfJourney?: string | null;
  boardingPoint?: string | null;
  source?: string | null;
  destination?: string | null;
  chartStatus?: string | null;
  passengersCount?: number;
  passengers?: PnrPassenger[];
  raw?: any;
};

async function trackEvent(
  event_name: string,
  payload: {
    section?: string;
    metadata?: Record<string, any>;
  } = {}
) {
  try {
    if (typeof window === "undefined") return;

    const key = "raileats_session_id";
    let sessionId = localStorage.getItem(key);

    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(key, sessionId);
    }

    await fetch("/api/website-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
      body: JSON.stringify({
        event_name,
        section: payload.section || null,
        page_url: window.location.href,
        page_path: window.location.pathname,
        session_id: sessionId,
        device:
          window.innerWidth < 640
            ? "mobile"
            : window.innerWidth < 1024
            ? "tablet"
            : "desktop",
        browser: navigator.userAgent.includes("Edg")
          ? "Edge"
          : navigator.userAgent.includes("Chrome")
          ? "Chrome"
          : navigator.userAgent.includes("Firefox")
          ? "Firefox"
          : navigator.userAgent.includes("Safari")
          ? "Safari"
          : "Other",
        metadata: payload.metadata || {},
      }),
    });
  } catch (err) {
    console.error("trackEvent failed:", err);
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusTone(status?: string | null) {
  const clean = String(status || "").toUpperCase();

  if (clean.includes("WL")) {
    return {
      bg: "#fee2e2",
      color: "#b91c1c",
    };
  }

  if (clean.includes("RAC")) {
    return {
      bg: "#dbeafe",
      color: "#1d4ed8",
    };
  }

  if (clean.includes("CNF") || clean.includes("CONFIRM")) {
    return {
      bg: "#dcfce7",
      color: "#15803d",
    };
  }

  return {
    bg: "#f1f5f9",
    color: "#334155",
  };
}

function getCountdown(value?: string | null) {
  if (!value) return "";

  const target = new Date(value).getTime();
  if (!Number.isFinite(target)) return "";

  const diff = target - Date.now();

  if (diff <= 0) return "Train departed";

  const totalMin = Math.floor(diff / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;

  if (days > 0) return `${days}d ${hours}h ${mins}m left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

function getShortDay(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date
    .toLocaleDateString("en-IN", {
      weekday: "short",
    })
    .toUpperCase();
}

function todayKey() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
}

function canSearchToday() {
  if (typeof window === "undefined") return true;

  const key = "raileats_pnr_search_limit";
  const today = todayKey();
  const saved = localStorage.getItem(key);

  if (!saved) return true;

  try {
    const parsed = JSON.parse(saved);
    if (parsed.date !== today) return true;
    return Number(parsed.count || 0) < 5;
  } catch {
    return true;
  }
}

function increaseSearchCount() {
  if (typeof window === "undefined") return;

  const key = "raileats_pnr_search_limit";
  const today = todayKey();
  const saved = localStorage.getItem(key);

  let count = 0;

  try {
    const parsed = saved ? JSON.parse(saved) : null;
    if (parsed?.date === today) {
      count = Number(parsed.count || 0);
    }
  } catch {}

  localStorage.setItem(
    key,
    JSON.stringify({
      date: today,
      count: count + 1,
    })
  );
}

export default function PnrStatusClient() {
  const [pnr, setPnr] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PnrResult | null>(null);
  const [error, setError] = useState("");

  const passengers = useMemo(() => {
    return result?.passengers || result?.raw?.passengerList || [];
  }, [result]);

  const handlePnrSearch = async () => {
    const clean = pnr.replace(/\D/g, "");

    if (clean.length !== 10) {
      setError("Please enter valid 10 digit PNR");
      return;
    }

    if (!canSearchToday()) {
      setError("Daily PNR search limit complete ho gaya. Please kal try karein.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      trackEvent("pnr_status_page_search_click", {
        section: "pnr_status_page",
        metadata: {
          pnr: clean,
        },
      });

      const res = await fetch(`/api/pnr/${clean}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setError(json?.message || json?.error || "PNR details not found");
        return;
      }

      increaseSearchCount();
      setResult(json);

      try {
        localStorage.setItem("raileats_pnr_details", JSON.stringify(json));
      } catch {}
    } catch (err) {
      console.error(err);
      setError("Unable to fetch PNR details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="customer-app-main">
      <section className="site-container max-w-2xl">
        <div className="app-card p-5 sm:p-6">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-orange-600">
              Indian Railway PNR Status
            </p>

            <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
              Check PNR Status Online
            </h1>

            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              Enter 10 digit PNR to view train, journey, chart, coach and seat
              details.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
            <input
              value={pnr}
              onChange={(e) =>
                setPnr(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="Enter PNR"
              className="app-input"
              inputMode="numeric"
            />

            <button
              type="button"
              onClick={handlePnrSearch}
              disabled={loading}
              className="app-btn-primary min-w-[92px]"
            >
              {loading ? "..." : "Search"}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-bold text-red-600">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-5 space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-sky-50 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-slate-500">PNR</div>
                    <div className="text-2xl font-black text-slate-950">
                      {result.pnr}
                    </div>
                  </div>

                  {result.chartStatus && (
                    <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                      {result.chartStatus}
                    </div>
                  )}
                </div>

                <div className="mt-4 text-base font-black text-slate-950">
                  🚆 {result.trainNo || "N/A"} - {result.trainName || "Train"}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-black text-slate-400">
                      Journey
                    </div>
                    <div className="mt-1 text-sm font-black text-slate-950">
                      {formatDateTime(result.dateOfJourney)}
                    </div>
                    <div className="mt-1 text-xs font-black text-orange-600">
                      {getShortDay(result.dateOfJourney)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-black text-slate-400">
                      Boarding countdown
                    </div>
                    <div className="mt-1 text-sm font-black text-slate-950">
                      {getCountdown(result.dateOfJourney)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-black text-slate-400">
                      Class
                    </div>
                    <div className="mt-1 text-sm font-black text-slate-950">
                      {result.raw?.journeyClass || "N/A"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-black text-slate-400">
                      Chart
                    </div>
                    <div className="mt-1 text-sm font-black text-slate-950">
                      {result.chartStatus || "N/A"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-black text-slate-400">
                      Boarding
                    </div>
                    <div className="mt-1 text-sm font-black text-slate-950">
                      {result.boardingPoint || result.source || "N/A"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-black text-slate-400">
                      Destination
                    </div>
                    <div className="mt-1 text-sm font-black text-slate-950">
                      {result.destination || result.raw?.reservationUpto || "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-950 mb-3">
                  Passenger Details ({pass
