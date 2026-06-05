type TrackEventPayload = {
  section?: string;
  user_name?: string | null;
  user_email?: string | null;
  user_mobile?: string | null;
  metadata?: Record<string, any>;
};

function getSessionId() {
  if (typeof window === "undefined") return null;

  const key = "raileats_session_id";
  let sessionId = localStorage.getItem(key);

  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, sessionId);
  }

  return sessionId;
}

function getDevice() {
  if (typeof window === "undefined") return null;

  const width = window.innerWidth;

  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";

  return "desktop";
}

function getBrowser() {
  if (typeof navigator === "undefined") return null;

  const ua = navigator.userAgent;

  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";

  return "Other";
}

export async function trackEvent(
  event_name: string,
  payload: TrackEventPayload = {}
) {
  try {
    if (typeof window === "undefined") return;

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
        user_name: payload.user_name || null,
        user_email: payload.user_email || null,
        user_mobile: payload.user_mobile || null,
        session_id: getSessionId(),
        device: getDevice(),
        browser: getBrowser(),
        metadata: payload.metadata || {},
      }),
    });
  } catch (err) {
    console.error("trackEvent failed:", err);
  }
}
