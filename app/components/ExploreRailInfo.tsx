"use client";

function getSessionId() {
  if (typeof window === "undefined") return "";

  const key = "raileats_session_id";
  let sessionId = localStorage.getItem(key);

  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, sessionId);
  }

  return sessionId;
}

async function trackEvent(
  event_name: string,
  payload: {
    section?: string;
    metadata?: Record<string, any>;
  } = {}
) {
  try {
    if (typeof window === "undefined") return;

    await fetch("/api/website-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event_name,
        section: payload.section || null,
        page_url: window.location.href,
        page_path: window.location.pathname,
        session_id: getSessionId(),
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

export default function ExploreRailInfo() {
  const handleExploreClick = (
    eventName: string,
    clickedSection: string,
    target?: string
  ) => {
    trackEvent(eventName, {
      section: "home_explore_railway_information",
      metadata: {
        clicked_section: clickedSection,
        target: target || null,
      },
    });

    if (target) {
      window.location.href = target;
    }
  };

  return (
    <section className="mt-10 max-w-4xl mx-auto px-4">
      <h2 className="text-center font-bold mb-4">
        Explore Railway Information
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <button
          type="button"
          onClick={() =>
            handleExploreClick(
              "home_live_train_status_click",
              "live_train_status",
              "/live-train-status"
            )
          }
          className="p-4 bg-white shadow rounded"
        >
          🚆 Live Train Status
        </button>

        <button
          type="button"
          onClick={() =>
            handleExploreClick(
              "home_check_pnr_click",
              "check_pnr_status",
              "/pnr-status"
            )
          }
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
  );
}
