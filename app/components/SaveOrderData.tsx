"use client";

import { useEffect } from "react";

export default function SaveOrderData({ data }: any) {
  useEffect(() => {
    if (data) {
      localStorage.setItem("order_data", JSON.stringify(data));
    }
  }, [data]);

  return (
    <style jsx global>{`
      /* The train page renders the station icon as an image inside
         .station-icon-wrap. Keep a guaranteed local SVG fallback so a
         broken/blocked data URI can never show the browser broken-image box. */
      .station-icon-wrap {
        background-image: url('/station-train-icon.svg') !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        background-size: 54px 54px !important;
      }

      .station-icon-wrap img {
        visibility: hidden !important;
        opacity: 0 !important;
      }

      /* Keep the heading fully inside narrow mobile screens. */
      .train-page-shell > h2 {
        max-width: 100% !important;
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        word-break: normal !important;
      }

      .train-page-shell {
        min-width: 0 !important;
        overflow-x: hidden !important;
      }
    `}</style>
  );
}
