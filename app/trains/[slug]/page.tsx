"use client";

import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";

/* helpers */
function extractTrainNumberFromSlug(slug?: string | null) {
  if (!slug) return "";
  const m = slug.match(/^(\d+)/);
  return m ? m[1] : slug.replace(/[^0-9]/g, "");
}

export default function TrainRedirectPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  useEffect(() => {
    const slug = (params as any)?.slug || "";
    const trainNumber = extractTrainNumberFromSlug(slug);

    const date = searchParams.get("date");
    const boarding = searchParams.get("boarding");

    // 🚨 LOOP PREVENTION
    if (window.location.pathname.startsWith("/trains/")) {
      return;
    }

    if (!trainNumber || !boarding) return;

    const url = `/trains/${trainNumber}?date=${date}&boarding=${boarding}`;

    window.location.replace(url); // replace instead of href
  }, []);

  return (
    <div className="p-6 text-center">
      Redirecting...
    </div>
  );
}
