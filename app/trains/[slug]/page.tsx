// app/trains/[slug]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type StationSummary = {
  StationCode: string;
  StationName: string;
  State: string;
  Arrival: string;
  RestroCount: number;
  MinOrder: number | null;
};

type ApiResponse = {
  status: number;
  error?: string;
  train: {
    trainNumber: string | number;
    trainName: string | null;
  } | null;
  stations: StationSummary[];
};

function getTrainNumberFromSlug(slug: string | string[] | undefined): string {
  if (!slug) return "";
  const s = Array.isArray(slug) ? slug[0] : slug;
  // "11016-jhelum-express-food-delivery-in-train" -> "11016"
  return s.split("-")[0] || s;
}

export default function TrainPage({
  params,
}: {
  params: { slug: string };
}) {
  const router = useRouter();
  const trainNumber = getTrainNumberFromSlug(params.slug);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!trainNumber) {
      setError("Invalid train number.");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `/api/home/train-search?train=${encodeURIComponent(trainNumber)}`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as ApiResponse;

        if (json.error || json.status >= 400) {
          setError(json.error || "Failed to load train details.");
          setData(null);
        } else {
          setData(json);
        }
      } catch (e) {
        console.error("train page load error", e);
        setError("Failed to load train details.");
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [trainNumber]);

  const trainName = data?.train?.trainName ?? "";
  const titleTrainNumber = data?.train?.trainNumber ?? trainNumber;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Back button */}
      <button
        className="mb-4 text-sm text-blue-600 hover:underline"
        onClick={() => router.push("/")}
      >
        ← Back to Home
      </button>

      {/* Header */}
      <h1 className="text-2xl font-semibold mb-1">
        Train {titleTrainNumber}
        {trainName ? ` – ${trainName}` : ""}
      </h1>
      <p className="text-sm text-gray-600 mb-4">
        Food delivery stations & restaurants available on this train.
      </p>

      {loading && (
        <p className="text-sm text-gray-500">Loading train details…</p>
      )}

      {error && !loading && (
        <p className="text-sm text-red-600 mb-4">{error}</p>
      )}

      {!loading && !error && data && (
        <>
          {(!data.stations || data.stations.length === 0) && (
            <p className="text-sm text-gray-500">
              Currently no active restaurants found on this train&apos;s
              route.
            </p>
          )}

          {data.stations && data.stations.length > 0 && (
            <div className="mt-4 border rounded bg-white overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Stn Code</th>
                    <th className="px-3 py-2 text-left">Station</th>
                    <th className="px-3 py-2 text-left">Arrival</th>
                    <th className="px-3 py-2 text-left">
                      Active Restaurants
                    </th>
                    <th className="px-3 py-2 text-left">Min. Order (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stations.map((s) => (
                    <tr key={s.StationCode} className="border-t">
                      <td className="px-3 py-2 align-top">
                        {s.StationCode}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium">
                          {s.StationName || "-"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {s.State || ""}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        {s.Arrival || "-"}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {s.RestroCount}{" "}
                        {s.RestroCount === 1 ? "restro" : "restros"} found
                      </td>
                      <td className="px-3 py-2 align-top">
                        {s.MinOrder != null ? `₹${s.MinOrder}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
