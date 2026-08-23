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
      /* Stable fallback for the station icon on the train-food page. */
      .train-page-shell .station-icon-wrap {
        background-image: url('/station-train-icon.svg');
        background-repeat: no-repeat;
        background-position: center;
        background-size: 54px 54px;
      }

      .train-page-shell .station-icon-wrap img {
        visibility: hidden !important;
      }

      /* Prevent the section heading from overflowing narrow mobile screens. */
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
