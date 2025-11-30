// app/trains/[slug]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type TrainStationRestro = {
  restroCode: number;
  restroName: string;
  minimumOrder: number | null;

  // optional – agar API se aayega to image bhi dikhayenge
  restroImageUrl?: string | null;
  cuisines?: string | null;
};

type TrainStation = {
  stationCode: string;
  stationName: string;
  arrivalTime: string | null;
  restroCount: number;
  minOrder: number | null;
  restros: TrainStationRestro[];

  // optional extra info
  stationImageUrl?: string | null;
  stateName?: string | null;
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

  // restroCount use karo
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

        <h1 className="text-2xl md:text-3xl font-semibold mb-1">
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
                {/* Station header – image + name + state + summary */}
                <div className="px-4 py-3 border-b flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* Station image */}
                    <div className="h-14 w-14 rounded overflow-hidden bg-gray-200 flex-shrink-0">
                      {st.stationImageUrl ? (
                        <img
                          src={st.stationImageUrl}
                          alt={st.stationName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-500">
                          No image
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-base md:text-lg font-semibold flex items-baseline gap-1">
                        <span>{st.stationName}</span>
                        <span className="text-xs md:text-sm text-gray-500">
                          ({st.stationCode})
                        </span>
                      </div>
                      {st.stateName && (
                        <div className="text-xs md:text-sm text-gray-700">
                          {st.stateName}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        Arrival: {st.arrivalTime ? st.arrivalTime : "-"}
                      </div>
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

                {/* Restros list – image + min order + Order Now */}
                <div className="p-4 space-y-3">
                  {st.restros.map((r) => (
                    <div
                      key={r.restroCode}
                      className="flex items-center gap-3 border rounded-lg px-3 py-2 hover:bg-gray-50"
                    >
                      {/* Restro image */}
                      <div className="h-16 w-16 rounded overflow-hidden bg-gray-200 flex-shrink-0">
                        {r.restroImageUrl ? (
                          <img
                            src={r.restroImageUrl}
                            alt={r.restroName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-500">
                            No image
                          </div>
                        )}
                      </div>

                      {/* Restro info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {r.restroName}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              Train food delivery at {st.stationName},{" "}
                              {st.stationCode}
                            </div>
                            {r.cuisines && (
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                {r.cuisines}
                              </div>
                            )}
                          </div>

                          {/* Min order + Order Now */}
                          <div className="flex flex-col items-end gap-1 text-right text-xs text-gray-600 flex-shrink-0">
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

                            <Link href={`/Stations/${st.stationCode}`}>
                              <button className="px-3 py-1 rounded bg-green-600 text-white text-xs">
                                Order Now
                              </button>
                            </Link>
                          </div>
                        </div>
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
