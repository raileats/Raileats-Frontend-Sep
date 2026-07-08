"use client";

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

export default function Offers() {
  return (
    <section id="offers" className="container-app">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="app-section-title">Offers for your journey</h2>
          <p className="app-muted text-sm">Use these codes during checkout.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            trackEvent("home_offer_rel20_click", {
              section: "home_offers",
              metadata: {
                coupon: "REL20",
                offer: "Flat Rs 20 OFF",
              },
            })
          }
          className="offer-card offer-yellow"
        >
          <div className="offer-left">
            <div className="offer-icon">💳</div>
            <div>
              <div className="offer-title">Flat Rs 20 OFF</div>
              <div className="offer-sub">On all orders above Rs 250</div>
            </div>
          </div>
          <div className="offer-code">REL20</div>
        </button>

        <button
          type="button"
          onClick={() =>
            trackEvent("home_offer_re50_click", {
              section: "home_offers",
              metadata: {
                coupon: "RE50",
                offer: "Flat Rs 50 OFF",
              },
            })
          }
          className="offer-card offer-green"
        >
          <div className="offer-left">
            <div className="offer-icon">🎁</div>
            <div>
              <div className="offer-title">Flat Rs 50 OFF</div>
              <div className="offer-sub">On all orders above Rs 500</div>
            </div>
          </div>
          <div className="offer-code">RE50</div>
        </button>
      </div>
    </section>
  );
}
