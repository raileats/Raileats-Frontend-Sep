"use client";

import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";

/* helpers */
function extractTrainNumberFromSlug(slug?: string | null) {
  if (!slug) return "";
  const m = slug.match(/^(\d+)/);
  return m ? m[1] : slug.replace(/[^0-9]/g, "");
}

function slugifyName(name?: string | null) {
  if (!name) return "";
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeStationSlug(code: string, name?: string) {
  const clean = slugifyName(name || "");
  return clean
    ? `${code.toUpperCase()}-${clean}-food-delivery-in-train`
    : `${code.toUpperCase()}-food-delivery-in-train`;
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

    // 👉 IMPORTANT: station name abhi nahi hai, to code se hi slug banayenge
    const stationSlug = makeStationSlug(boarding, boarding);

    // 👉 redirect
    const url = `/Stations/${stationSlug}?train=${trainNumber}&date=${date}&boarding=${boarding}`;

    window.location.href = url;
  }, []);

  return (
    <div className="p-6 text-center">
      Redirecting to stations...
    </div>
  );
}
