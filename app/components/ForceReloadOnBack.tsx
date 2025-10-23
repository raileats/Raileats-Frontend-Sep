// app/components/ForceReloadOnBack.tsx
"use client";

import { useEffect } from "react";

/**
 * ForceReloadOnBack - global client helper
 *
 * Features:
 *  - On pageshow persisted (bfcache/back), show spinner then force reload.
 *  - On manual refresh (beforeunload / F5 / Ctrl+R), show spinner.
 *  - Monkey-patch history.pushState / replaceState to detect SPA navigation and show spinner.
 *  - Observe `.site-container` mutations to auto-hide spinner when new page content renders.
 *  - Expose custom events: `raileats:show-spinner` and `raileats:hide-spinner`.
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
    // ---------------- pageshow handler (bfcache restore) ----------------
    const onPageShow = (ev: PageTransitionEvent | Event) => {
      const persisted = (ev as any).persisted === true;
      if (persisted) {
        // Show spinner and reload to get fresh server content
        showSpinner();
        setTimeout(() => {
          window.location.reload();
        }, 60);
      } else {
        // not persisted: ensure spinner hidden when arriving fresh
        hideSpinner();
      }
    };

    // ---------------- beforeunload handler (manual refresh) ----------------
    const onBeforeUnload = (ev: BeforeUnloadEvent) => {
      // Show spinner (may not be visible in every browser, but works in many)
      showSpinner();
      return undefined;
    };

    // ---------------- keydown handler (F5 / Ctrl+R fallback) ----------------
    const onKeyDown = (e: KeyboardEvent) => {
      const isRefresh =
        e.key === "F5" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r");
      if (isRefresh) {
        showSpinner();
      }
    };

    // ---------------- history API patching to detect SPA navigations ----------------
    // store originals
    const _pushState = history.pushState;
    const _replaceState = history.replaceState;

    function patchedPushState(this: History, ...args: any[]) {
      // call original
      const res = _pushState.apply(this, args as any);
      // dispatch custom event
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
      // patch only if not already patched
      if (history.pushState !== patchedPushState) history.pushState = patchedPushState as any;
      if (history.replaceState !== patchedReplaceState) history.replaceState = patchedReplaceState as any;
    } catch (err) {
      // ignore if not allowed
      console.warn("ForceReloadOnBack: could not patch history API", err);
    }

    // Also listen for popstate (back/forward) to show spinner as navigation starts (optional)
    const onPopState = () => {
      // show spinner on SPA back navigation (actual pageshow handler will handle reload if bfcache)
      showSpinner();
      // spinner will be hidden by mutation observer when DOM updates, or pageshow will reload if persisted
    };

    // ---------------- listen for our history-change event ----------------
    const onRaileatsHistoryChange = () => {
      // SPA navigation started: show spinner
      showSpinner();
      // We'll hide spinner when DOM changes (see mutation observer below)
    };

    // ---------------- MutationObserver to auto-hide spinner ----------------
    // Observe `.site-container` (the wrapper added in layout) for changes to content
    let observer: MutationObserver | null = null;
    const startObserve = () => {
      const container = document.querySelector<HTMLElement>(".site-container") || document.querySelector<HTMLElement>("main");
      if (!container) return;
      // If an observer exists, disconnect first
      if (observer) observer.disconnect();

      observer = new MutationObserver((mutations) => {
        // If content changed, hide spinner after a small debounce
        if (mutations && mutations.length > 0) {
          // wait a tick so rendering completes
          setTimeout(() => {
            hideSpinner();
          }, 180);
        }
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
      });
    };

    // If container arrives later, try startObserve after short delay
    setTimeout(startObserve, 120);
    // also try again on load
    window.addEventListener("load", startObserve);

    // ---------------- custom events to show/hide spinner ----------------
    const onShowEvent = () => showSpinner();
    const onHideEvent = () => hideSpinner();

    // Attach listeners
    window.addEventListener("pageshow", onPageShow as EventListener);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("raileats:history-change", onRaileatsHistoryChange);
    window.addEventListener("raileats:show-spinner", onShowEvent);
    window.addEventListener("raileats:hide-spinner", onHideEvent);

    // Hide spinner on normal load as safety
    window.addEventListener("load", hideSpinner);

    // Cleanup
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

      if (observer) {
        observer.disconnect();
        observer = null;
      }

      // restore history methods if they still point to our patched functions
      try {
        if (history.pushState === patchedPushState) history.pushState = _pushState;
        if (history.replaceState === patchedReplaceState) history.replaceState = _replaceState;
      } catch {}
    };
  }, []);

  return null;
}
