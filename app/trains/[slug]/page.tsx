"use client";

import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";

/* helpers */
function extractTrainNumberFromSlug(slug?: string | null) {
  if (!slug) return "";
  const m = slug.match(/^(\d+)/);
  return m ? m[1] : slug.replace(/[^0-9]/g, "");
}

/* component */
export default function TrainRedirectPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  useEffect(() => {
    const slug = (params as any)?.slug || "";
    const trainNumber = extractTrainNumberFromSlug(slug);

    const date = searchParams.get("date");
    const boarding = searchParams.get("boarding");

    if (!trainNumber) {
      alert("Train number missing");
      return;
    }

    if (!boarding) {
      alert("Please select boarding station");
      return;
    }

    // ✅ FIX: अब /trains पर redirect करेंगे (NOT /Stations)
    const url = `/trains/${trainNumber}?date=${date}&boarding=${boarding}`;

    window.location.href = url;
  }, []);

  return (
    <div className="p-6 text-center">
      Loading train restaurants...
    </div>
  );
}
