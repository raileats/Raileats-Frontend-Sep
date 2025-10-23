"use client";

import { useEffect } from "react";

/**
 * ForceReloadOnBack - global client helper
 *
 * - Shows #global-raileats-spinner by adding .show
 * - On pageshow persisted (bfcache restore) -> show spinner then reload
 * - On beforeunload / F5 -> show spinner
 * - Patches history.pushState/replaceState to detect SPA navigation and show spinner
 * - Observes .site-container DOM mutations to hide spinner after content changes
 * - Exposes custom events: raileats:show-spinner and raileats:hide-spinner
 */

function showSpinner() {
  try {
    const el = document.getElementById("global-raileats-spinner");
    if (!el) return;
    el.classList.add("show");
  } catch {}
}
function hideSpinner() {
  try {
    const el = document.getElementById("global-raileats-spinner");
    if (!el) return;
    el.classList.remove("show");
  } catch {}
}

export default function ForceReloadOnBack() {
  useEffect(() => {
    // pageshow (handle bfcache restore)
    const onPageShow = (ev: any) => {
      const persisted = ev && ev.persisted === true;
      if (persisted) {
        showSpinner();
        // reload to get fresh server-side content
        setTimeout(() => window.location.reload(), 60);
      } else {
        hideSpinner();
      }
    };

    // beforeunload: show spinner when user refreshes / navigates away
    const onBeforeUnload = (ev: BeforeUnloadEvent) => {
      showSpinner();
      // leave default behavior
      return undefined;
    };

    // keydown: detect F5 / Ctrl/Cmd+R
    const onKeyDown = (e: KeyboardEvent) => {
      const isRefresh = e.key === "F5" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r");
      if (isRefresh) showSpinner();
    };

    // patch history API to detect SPA navigation
    const _pushState = history.pushState;
    const _replaceState = history.replaceState;

    function patchedPushState(this: History, ...args: any[]) {
      const res = _pushState.apply(this, args as any);
      try {
        window.dispatchEvent(new CustomEvent("raileats:history-change", { detail: { method: "pushState" } }));
      } catch {}
      return res;
    }
    function patchedReplaceState(this: History, ...args: any[]) {
      const res = _replaceState.apply(this, args as any);
      try {
        window.dispatchEvent(new CustomEvent("raileats:history-change", { detail: { method: "replaceState" } }));
      } catch {}
      return res;
    }

    try {
      if (history.pushState !== patchedPushState) history.pushState = patchedPushState as any;
      if (history.replaceState !== patchedReplaceState) history.replaceState = patchedReplaceState as any;
    } catch (err) {
      console.warn("ForceReloadOnBack: could not patch history API", err);
    }

    // on popstate (back/forward) show spinner — pageshow will decide reload if persisted
    const onPopState = () => showSpinner();

    // on our history-change event (SPA nav) show spinner
    const onRaileatsHistoryChange = () => showSpinner();

    // mutation observer to auto-hide spinner when .site-container changes
    let observer: MutationObserver | null = null;
    const startObserve = () => {
      const container = document.querySelector<HTMLElement>(".site-container") || document.querySelector<HTMLElement>("main");
      if (!container) return;
      if (observer) observer.disconnect();
      observer = new MutationObserver((mutations) => {
        if (mutations && mutations.length > 0) {
          setTimeout(() => hideSpinner(), 180);
        }
      });
      observer.observe(container, { childList: true, subtree: true });
    };
    setTimeout(startObserve, 120);
    window.addEventListener("load", startObserve);

    // custom show/hide events
    const onShowEvent = () => showSpinner();
    const onHideEvent = () => hideSpinner();

    // attach listeners
    window.addEventListener("pageshow", onPageShow as EventListener);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("raileats:history-change", onRaileatsHistoryChange);
    window.addEventListener("raileats:show-spinner", onShowEvent);
    window.addEventListener("raileats:hide-spinner", onHideEvent);
    window.addEventListener("load", hideSpinner);

    // cleanup
    return () => {
      window.removeEventListener("pageshow", onPageShow as EventListener);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("raileats:history-change", onRaileatsHistoryChange);
      window.removeEventListener("raileats:show-spinner", onShowEvent);
      window.removeEventListener("raileats:hide-spinner", onHideEvent);
      window.removeEventListener("load", hideSpinner);
      window.removeEventListener("load", startObserve);
      if (observer) { observer.disconnect(); observer = null; }
      try {
        if (history.pushState === patchedPushState) history.pushState = _pushState;
        if (history.replaceState === patchedReplaceState) history.replaceState = _replaceState;
      } catch {}
    };
  }, []);

  return null;
}
