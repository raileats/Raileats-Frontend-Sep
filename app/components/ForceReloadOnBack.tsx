"use client";

import { useEffect } from "react";

export default function ForceReloadOnBack() {
  useEffect(() => {
    // This event fires when a page is restored from bfcache (browser back/forward)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // page came from browser cache → force reload for fresh data
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return null;
}
