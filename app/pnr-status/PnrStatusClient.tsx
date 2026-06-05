"use client";

import { useMemo, useState } from "react";

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
  passengers?: any[];
  raw?: any;
};

function formatDateTime(value?: string | null) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getShortDay(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date
    .toLocaleDateString("en-IN", { weekday: "short" })
    .toUpperCase();
}

function getCountdown(value?: string | null) {
  if (!value) return "N/A";

  const target = new Date(value).getTime();
  if (!Number.isFinite(target)) return "N/A";

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

function getStatusTone(status?: string | null) {
  const clean = String(status || "").toUpperCase();

  if (clean.includes("WL")) return { bg: "#fee2e2", color: "#b91c1c" };
  if (clean.includes("RAC")) return { bg: "#dbeafe", color: "#1d4ed8" };
  if (clean.includes("CNF") || clean.includes("CONFIRM")) {
    return { bg: "#dcfce7", color: "#15803d" };
  }

  return { bg: "#f1f5f9", color: "#334155" };
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
  } catch (e) {
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
    if (parsed && parsed.date === today) {
      count = Number(parsed.count || 0);
    }
  } catch (e) {
    count = 0;
  }

  localStorage.setItem(key, JSON.stringify({ date: today, count: count + 1 }));
}

async function trackEvent(eventName: string, metadata: Record<string, any> = {}) {
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
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event_name: eventName,
        section: "pnr_status_page",
        page_url: window.location.href,
        page_path: window.location.pathname,
        session_id: sessionId,
        device:
          window.innerWidth < 640
            ? "mobile"
            : window.innerWidth < 1024
            ? "tablet"
            : "desktop",
        browser: navigator.userAgent,
        metadata,
      }),
    });
  } catch (e) {
    console.error("trackEvent failed", e);
  }
}

function InfoBox(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="text-xs font-black text-slate-400">{props.label}</div>
      <div className="mt-1 text-sm font-black text-slate-950">
        {props.value}
      </div>
    </div>
  );
}

export default function PnrStatusClient() {
  const [pnr, setPnr] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PnrResult | null>(null);
  const [error, setError] = useState("");

  const passengers = useMemo(() => {
    if (!result) return [];
    return result.passengers || result.raw?.passengerList || [];
  }, [result]);

  async function handlePnrSearch() {
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

      trackEvent("pnr_status_page_search_click", { pnr: clean });

      const res = await fetch(`/api/pnr/${clean}`, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setError(json?.message || json?.error || "PNR details not found");
        return;
      }

      increaseSearchCount();
      setResult(json);

      try {
        localStorage.setItem("raileats_pnr_details", JSON.stringify(json));
      } catch (e) {}
    } catch (e) {
      console.error(e);
      setError("Unable to fetch PNR details");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="customer-app-main">
      <section className="site-container max-w-2xl">
        <div className="app-card p-5 sm:p-6">
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
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
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
                  Train {result.trainNo || "N/A"} - {result.trainName || "Train"}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <InfoBox
                    label="Journey"
                    value={formatDateTime(result.dateOfJourney)}
                  />
                  <InfoBox
                    label="Boarding countdown"
                    value={getCountdown(result.dateOfJourney)}
                  />
                  <InfoBox
                    label="Class"
                    value={result.raw?.journeyClass || "N/A"}
                  />
                  <InfoBox
                    label="Chart"
                    value={result.chartStatus || "N/A"}
                  />
                  <InfoBox
                    label="Boarding"
                    value={result.boardingPoint || result.source || "N/A"}
                  />
                  <InfoBox
                    label="Destination"
                    value={result.destination || result.raw?.reservationUpto || "N/A"}
                  />

                  {getShortDay(result.dateOfJourney) && (
                    <div className="col-span-2 rounded-2xl border border-orange-100 bg-orange-50 p-3 text-sm font-black text-orange-700">
                      Boarding Day: {getShortDay(result.dateOfJourney)}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-lg font-black text-slate-950">
                  Passenger Details ({passengers.length})
                </h2>

                <div className="space-y-3">
                  {passengers.map((p: any, idx: number) => {
                    const currentStatus =
                      p.currentDetails ||
                      p.currentStatusDetails ||
                      p.currentStatus ||
                      "N/A";

                    const bookingStatus =
                      p.bookingDetails ||
                      p.bookingStatusDetails ||
                      p.bookingStatus ||
                      "N/A";

                    const tone = getStatusTone(currentStatus);

                    return (
                      <div
                        key={idx}
                        className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-base font-black text-slate-950">
                            Passenger {idx + 1}
                          </div>

                          <div
                            className="rounded-full px-3 py-1 text-xs font-black"
                            style={{ background: tone.bg, color: tone.color }}
                          >
                            {p.currentStatus || "N/A"}
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <div className="text-xs font-black text-slate-400">
                              Current Status
                            </div>
                            <div
                              className="mt-1 text-base font-black leading-tight"
                              style={{ color: tone.color }}
                            >
                              {currentStatus}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-slate-50 p-3">
                            <div className="text-xs font-black text-slate-400">
                              Booking Status
                            </div>
                            <div className="mt-1 text-sm font-semibold leading-tight text-slate-900">
                              {bookingStatus}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                Disclaimer: PNR status is fetched from railway data providers
                and may change anytime. Please verify final coach, seat and
                chart details with official railway sources before boarding.
              </div>
            </div>
          )}
        </div>

        <section className="mt-5 app-card p-5">
          <h2 className="text-xl font-black text-slate-950">
            Check Indian Railway PNR Status Online
          </h2>

          <p className="mt-2
