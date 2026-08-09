"use client";

import { useEffect } from "react";
import { clearCompletedBookingState } from "../lib/bookingSession";

export default function OrderSuccessNavigation() {
  useEffect(() => {
    clearCompletedBookingState();

    const returnHome = () => {
      clearCompletedBookingState();
      window.location.replace("/");
    };

    window.addEventListener("popstate", returnHome);
    return () => window.removeEventListener("popstate", returnHome);
  }, []);

  return null;
}
