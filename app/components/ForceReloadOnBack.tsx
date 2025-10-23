"use client";

import { useEffect } from "react";

export default function ForceReloadOnBack() {
  useEffect(() => {
    // Browser 'back' or 'forward' navigation detect karega
    const handlePopState = () => {
      // force reload current page fresh from server
      window.location.reload();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return null; // No UI, sirf logic
}
