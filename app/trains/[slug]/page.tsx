"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { makeStationSlug } from "../../lib/stationSlug";

type TrainInfo = {
  trainNumber: string | number;
  trainName: string | null;
  date?: string | null;
};

type TrainRestro = {
  restroCode: number | string;
  restroName: string;
  minimumOrder: number | null;
};

type TrainStationInfo = {
  stationCode: string;
  stationName: string;
  arrivalTime: string | null;
  restroCount: number;
  minOrder: number | null;
  restros: TrainRestro[];
};

type ApiResponse = {
  ok: boolean;
  train?: TrainInfo;
  stations?: TrainStationInfo[];
  error?: string;
};

function formatCurrency(v: number | null | undefined) {
  if (v == null || isNaN(Number(v))) return "-";
  return `₹${Number(v).toFixed(0)}`;
}

export default function TrainFoodPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";

  // slug example: "11016-train-food-delivery-in-train"
  const slugFirstPart = slug.split(/[^\d]+/)[0] || slug.split("-")[0] || slug;
  const trainNumberFromSlug = slugFirstPart || slug;

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const url = `/api/home/train-search?train=${encodeURIComponent(
          String(trainNumberFromSlug),
        )}`;

        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as ApiResponse;

        if (!json.ok) {
          setError(json.error || "Failed to load data.");
          setData(json);
        } else {
          setData(json);
        }
      } catch (e) {
        console.error("train page fetch error", e);
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [trainNumberFromSlug]);

  const trainTitleNumber =
    (data?.train?.trainNumber ?? trainNumberFromSlug) || "Train";

  const trainTitleName = data?.train?.trainName
    ? ` – ${data.train.trainName}`
    : "";

  const stations = data?.stations ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-black text-white">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/raileats-logo.png"
              alt="RailEats"
              className="w-8 h-8 rounded-full object-contain bg-white"
            />
            <span className="font-semibold text-lg">RailEats</span>
          </Link>

          <Link
            href="/vendor/login"
            className="px-4 py-1.5 bg-white text-black rounded-full text-sm font-medium"
          >
            Login
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Link
          href="/"
          className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 mb-4"
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
          <p className="text-sm text-gray-500 mb-4">Loading stations…</p>
        )}
        {error && (
          <p className="text-sm text-red-600 mb-4">
            {error === "train_not_found"
              ? "Train not found."
              : error || "Something went wrong."}
          </p>
        )}

        {/* ==== STATIONS & RESTAURANTS LIST ==== */}
        {(!loading && stations.length === 0) && (
          <p className="text-sm text-gray-600">
            No active restaurants found on this train yet.
          </p>
        )}

        <div className="space-y-6">
          {stations.map((st) => {
            if (!st.restroCount || st.restroCount <= 0 || st.restros.length === 0) {
              return null;
            }

            const stationSlug = makeStationSlug(
              st.stationCode,
              st.stationName,
            );

            return (
              <section
                key={`${st.stationCode}-${st.arrivalTime}`}
                className="bg-white rounded-lg shadow-sm border"
              >
                {/* Station header row (similar to BPL page header, but compact) */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b px-4 py-3">
                  <div>
                    <div className="font-semibold text-base">
                      {st.stationName}{" "}
                      <span className="text-xs text-gray-500">
                        ({st.stationCode})
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Arrival: {st.arrivalTime || "-"}
                    </div>
                  </div>

                  <div className="mt-2 md:mt-0 text-right text-xs text-gray-600">
                    <div>
                      Active restaurants:{" "}
                      <span className="font-semibold">{st.restroCount}</span>
                    </div>
                    <div>
                      Min. order from{" "}
                      <span className="font-semibold">
                        {formatCurrency(st.minOrder)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Restaurants list – styled similar to station page cards */}
                <div className="p-3 md:p-4 space-y-3">
                  {st.restros.map((r) => (
                    <Link
                      key={r.restroCode}
                      href={`/Stations/${stationSlug}`}
                      className="flex flex-col md:flex-row gap-3 items-stretch md:items-center border rounded-lg px-3 py-3 hover:shadow-sm transition-shadow bg-white"
                    >
                      {/* image placeholder – you can change src to match station page component */}
                      <div className="w-full md:w-32 h-24 md:h-20 rounded-md bg-gray-100 overflow-hidden flex-shrink-0">
                        <img
                          src={`/images/stations/${st.stationCode}.jpg`}
                          alt={st.stationName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // fallback: simple grey block if image missing
                            (e.currentTarget as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </div>

                      <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <div className="font-semibold text-sm md:text-base">
                            {r.restroName}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Train food delivery at {st.stationName},{" "}
                            {st.stationCode}
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-4">
                          <div className="text-xs text-gray-600 text-right">
                            <div>
                              Min order{" "}
                              <span className="font-semibold">
                                {formatCurrency(r.minimumOrder)}
                              </span>
                            </div>
                            {/* extra tags like Veg / Non-Veg, cuisines, timing
                                can be added here later if you include them in the API */}
                          </div>

                          <button
                            type="button"
                            className="px-3 py-1.5 text-xs md:text-sm bg-green-600 text-white rounded-md font-medium hover:bg-green-700"
                          >
                            Order Now
                          </button>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
