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

export default function ExploreRailInfo() {
  const [pnrOpen, setPnrOpen] = useState(false);
  const [pnr, setPnr] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PnrResult | null>(null);
  const [error, setError] = useState("");

  const passengers = useMemo(() => {
    return result?.passengers || result?.raw?.passengerList || [];
  }, [result]);

  const handleExploreClick = (eventName: string, clickedSection: string) => {
    trackEvent(eventName, {
      section: "home_explore_railway_information",
      metadata: {
        clicked_section: clickedSection,
      },
    });
  };

  const openPnrModal = () => {
    handleExploreClick("home_check_pnr_click", "check_pnr_status");
    setPnrOpen(true);
  };

  const handlePnrSearch = async () => {
    const clean = pnr.replace(/\D/g, "");

    if (clean.length !== 10) {
      setError("Please enter valid 10 digit PNR");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      trackEvent("home_pnr_status_search_click", {
        section: "home_pnr_status_popup",
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

      setResult(json);
    } catch (err) {
      console.error(err);
      setError("Unable to fetch PNR details");
    } finally {
      setLoading(false);
    }
  };

  const closePnrModal = () => {
    setPnrOpen(false);
    setPnr("");
    setResult(null);
    setError("");
  };

  return (
    <>
      <section className="mt-10 max-w-4xl mx-auto px-4">
        <h2 className="text-center font-bold mb-4">Explore Railway Information</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <button
            type="button"
            onClick={() =>
              handleExploreClick("home_track_live_train_click", "track_live_train")
            }
            className="p-4 bg-white shadow rounded"
          >
            🚆 Track Live Train
          </button>

          <button
            type="button"
            onClick={openPnrModal}
            className="p-4 bg-white shadow rounded"
          >
            📋 Check PNR Status
          </button>

          <button
            type="button"
            onClick={() =>
              handleExploreClick("home_platform_locator_click", "platform_locator")
            }
            className="p-4 bg-white shadow rounded"
          >
            📍 Platform Locator
          </button>

          <button
            type="button"
            onClick={() =>
              handleExploreClick("home_train_time_table_click", "train_time_table")
            }
            className="p-4 bg-white shadow rounded"
          >
            🕒 Train Time Table
          </button>
        </div>
      </section>

      {pnrOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[88vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-5 z-10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-slate-950">
                    Check PNR Status
                  </h3>
                  <p className="text-sm font-semibold text-slate-500 mt-1">
                    Enter 10 digit PNR to view journey details.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closePnrModal}
                  className="w-10 h-10 rounded-full border border-slate-200 text-xl font-black"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <input
                  value={pnr}
                  onChange={(e) =>
                    setPnr(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="Enter PNR"
                  className="app-input"
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
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-bold text-red-600">
                  {error}
                </div>
              )}

              {result && (
                <>
                  <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-sky-50 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-slate-500">
                          PNR
                        </div>
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
                    <h4 className="text-lg font-black text-slate-950 mb-3">
                      Passenger Details ({passengers.length})
                    </h4>

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
                                style={{
                                  background: tone.bg,
                                  color: tone.color,
                                }}
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

                  <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3 text-xs font-semibold text-amber-800">
                    Disclaimer: PNR status is fetched from railway data providers
                    and may change anytime. Please verify final coach, seat and
                    chart details with official railway sources before boarding.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
