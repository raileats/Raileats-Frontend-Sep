"use client";
import { useEffect } from "react";

export default function GlobalSpinner() {
  useEffect(() => {
    const el = document.getElementById("global-raileats-spinner");
    if (!el) return;

    const show = () => el.classList.add("show");
    const hide = () => el.classList.remove("show");

    // show spinner on unload/navigation start
    window.addEventListener("beforeunload", show);
    // single page navigations (link clicks) - listen to visibilitychange fallback
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") show();
      else hide();
    });

    // hide on load
    window.addEventListener("load", hide);

    return () => {
      window.removeEventListener("beforeunload", show);
      document.removeEventListener("visibilitychange", () => {});
      window.removeEventListener("load", hide);
    };
  }, []);

  return (
    <div id="global-raileats-spinner" aria-hidden>
      <div className="outer-ring">
        <div className="inner-logo">
          <img src="/raileats-logo.png" alt="RailEats" />
        </div>
      </div>
    </div>
  );
}
