// app/trains/[slug]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type TrainStationRestro = {
  restroCode: number;
  restroName: string;
  minimumOrder: number | null;
};

type TrainStation = {
  stationCode: string;
  stationName: string;
  arrivalTime: string | null;
  restroCount: number;
  minOrder: number | null;
  restros: TrainStationRestro[];
};

type ApiResponse = {
  ok: boolean;
  train?: {
    trainNumber: number | string;
    trainName?: string | null;
    date?: string | null;
  };
  stations?: TrainStation[];
  error?: string;
};

export default function TrainFoodPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "";

  // slug format: 11016-train-food-delivery-in-train
  const trainNumberFromSlug = slug.split("-")[0] || "";

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!trainNumberFromSlug) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `/api/home/train-search?train=${encodeURIComponent(
            trainNumberFromSlug,
          )}`,
          { cache: "no-store" },
        );

        const json: ApiResponse = await res.json();
        if (!json.ok) {
          setError(json.error || "Something went wrong");
          setData(null);
          return;
        }

        setData(json);
      } catch (e) {
        console.error("train-search page error", e);
        setError("Failed to load data.");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [trainNumberFromSlug]);

  const trainTitleNumber =
    (data?.train?.trainNumber ?? trainNumberFromSlug) || "Train";

  const trainTitleName = data?.train?.trainName
    ? ` – ${data.train.trainName}`
    : "";

  const stations = data?.stations ?? [];

  // ✅ yahi main fix hai: restroCount use karo, activeRestrosCount nahi
  const stationsWithRestros = stations.filter(
    (s) => (s.restroCount ?? 0) > 0,
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-black text-white py-3 px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/raileats-logo.png"
            alt="RailEats"
            className="h-8 w-8 object-contain"
          />
          <span className="font-semibold text-lg">RailEats</span>
        </Link>
        <button className="px-4 py-1 rounded bg-white text-black text-sm">
          Login
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Link
          href="/"
          className="text-sm text-blue-600 hover:underline inline-block mb-3"
        >
          ← Back to Home
        </Link>

        <h1 className="text-2xl font-semibold mb-1">
          Train {trainTitleNumber}
          {trainTitleName}
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          Food delivery stations &amp; restaurants available on this train.
        </p>

        {loading && (
          <p className="text-sm text-gray-500">Loading stations…</p>
        )}

        {error && !loading && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        {!loading && !error && stationsWithRestros.length === 0 && (
          <p className="text-sm text-gray-600">
            No active restaurants found on this train yet.
          </p>
        )}

        {!loading && !error && stationsWithRestros.length > 0 && (
          <div className="space-y-4 mt-4">
            {stationsWithRestros.map((st) => (
              <section
                key={st.stationCode}
                className="bg-white rounded-lg shadow-sm border"
              >
                {/* Station header (same feel as station page) */}
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">
                      {st.stationName}{" "}
                      <span className="text-xs text-gray-500">
                        ({st.stationCode})
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Arrival:{" "}
                      {st.arrivalTime
                        ? st.arrivalTime
                        : "-"}
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-600">
                    <div>
                      Active restaurants:{" "}
                      <span className="font-semibold">
                        {st.restroCount}
                      </span>
                    </div>
                    {st.minOrder != null && st.minOrder > 0 && (
                      <div className="mt-1">
                        Min. order from{" "}
                        <span className="font-semibold">
                          ₹{st.minOrder}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Restros list (like station listing) */}
                <div className="p-4 space-y-3">
                  {st.restros.map((r) => (
                    <div
                      key={r.restroCode}
                      className="flex items-center justify-between border rounded-lg px-3 py-2 hover:bg-gray-50"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {r.restroName}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Train food delivery at {st.stationName},{" "}
                          {st.stationCode}
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-600">
                        {r.minimumOrder != null && r.minimumOrder > 0 ? (
                          <div>
                            Min order{" "}
                            <span className="font-semibold">
                              ₹{r.minimumOrder}
                            </span>
                          </div>
                        ) : (
                          <div>Min order –</div>
                        )}
                        {/* future: yaha veg / non-veg / cuisines badges add kar sakte ho */}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
