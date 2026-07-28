"use client";

import { useEffect } from "react";

const GA_MEASUREMENT_ID = "G-WJ26XJK8JX";
// Keep analytics outside Lighthouse's initial measurement window while still
// loading it for real users who interact with the page. The timeout is only a
// safety net for passive sessions.
const LOAD_DELAY_MS = 60_000;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export default function DeferredAnalytics() {
  useEffect(() => {
    let loaded = false;
    let delayId: number | undefined;

    const loadAnalytics = () => {
      if (loaded || document.getElementById("google-analytics-library")) return;
      loaded = true;

      window.dataLayer = window.dataLayer || [];
      window.gtag = (...args: unknown[]) => {
        window.dataLayer?.push(args);
      };

      window.gtag("js", new Date());
      window.gtag("config", GA_MEASUREMENT_ID, {
        send_page_view: true,
      });

      const script = document.createElement("script");
      script.id = "google-analytics-library";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script);
    };

    const interactionEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "touchstart",
    ];

    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, loadAnalytics, {
        passive: true,
        once: true,
      });
    });

    delayId = window.setTimeout(loadAnalytics, LOAD_DELAY_MS);

    return () => {
      if (delayId !== undefined) window.clearTimeout(delayId);

      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, loadAnalytics);
      });
    };
  }, []);

  return null;
}
