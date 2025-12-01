// app/trains/[slug]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { makeStationSlug } from "../../lib/stationSlug";

type ApiRestro = {
  restroCode: number | string;
  restroName: string;
  minimumOrder: number | null;
};

type ApiStation = {
  stationCode: string;
  stationName: string;
  arrivalTime: string | null;
  restroCount: number;
  minOrder: number | null;
  restros: ApiRestro[];
};

type ApiTrainSearchResponse = {
  ok: boolean;
  train?: {
    trainNumber: number | string | null;
    trainName: string | null;
    date?: string | null;
  };
  stations?: ApiStation[];
  error?: string;
};

export default function TrainFoodPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || "";

  // slug format: 11016-train-food-delivery-in-train
  const trainNumberFromSlug = slug.split("-")[0];

  const [data, setData] = useState<ApiTrainSearchResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trainNumberFromSlug) {
      setError("Invalid train number in URL.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/home/train-search?train=${encodeURIComponent(
            trainNumberFromSlug,
          )}`,
          { cache: "no-store" },
        );

        const json = (await res.json()) as ApiTrainSearchResponse;

        if (!res.ok || !json.ok) {
          setError(json.error || "Failed to load train details.");
          setData(null);
        } else {
          setData(json);
        }
      } catch (e) {
        console.error("train page fetch error", e);
        setError("Failed to load train details.");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [trainNumberFromSlug]);

  const trainTitleNumber =
    (data?.train?.trainNumber ?? trainNumberFromSlug) || "Train";

  const trainTitleName = data?.train?.trainName
    ? ` – ${data.train.trainName}`
    : "";

  const stations = data?.stations ?? [];

  const handleBack = () => {
    router.push("/");
  };

  const formatCurrency = (val: number | null | undefined) => {
    if (val == null || Number.isNaN(Number(val))) return "-";
    return `₹${Number(val).toFixed(0)}`;
  };

  const makeRestroSlug = (code: string | number, name: string) => {
    const cleanName = name
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    return `${code}-${encodeURIComponent(cleanName)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* top black bar spacing already from layout header */}

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Back link */}
        <button
          type="button"
          onClick={handleBack}
          className="text-sm text-blue-600 hover:underline mb-4"
        >
          ← Back to Home
        </button>

        {/* Train heading */}
        <h1 className="text-2xl md:text-3xl font-semibold mb-1">
          Train {trainTitleNumber}
          {trainTitleName}
        </h1>

        <p className="text-sm text-gray-600 mb-6">
          Food delivery stations &amp; restaurants available on this train.
        </p>

        {/* Loading / error / empty states */}
        {loading && (
          <p className="text-sm text-gray-500">Loading train details…</p>
        )}

        {!loading && error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && stations.length === 0 && (
          <p className="text-sm text-gray-500">
            No active restaurants found on this train yet.
          </p>
        )}

        {/* Stations with restaurants */}
        {!loading &&
          !error &&
          stations.map((st) => {
            const hasRestros = (st.restros || []).length > 0;
            const stationSlug = makeStationSlug(
              st.stationCode,
              st.stationName,
            );

            return (
              <section
                key={`${st.stationCode}-${st.arrivalTime}`}
                className="mt-6 bg-white rounded-lg shadow-sm border"
              >
                {/* Station header row (like BPL header, compact) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3 border-b bg-gray-50">
                  <div>
                    <div className="text-sm font-semibold">
                      {st.stationName}{" "}
                      <span className="text-xs text-gray-500">
                        ({st.stationCode})
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Arrival: {st.arrivalTime || "-"}
                    </div>
                  </div>

                  <div className="mt-2 md:mt-0 text-xs text-right text-gray-600">
                    <div>
                      Active restaurants:{" "}
                      <span className="font-semibold">
                        {st.restroCount ?? st.restros.length}
                      </span>
                    </div>
                    <div className="mt-1">
                      Min. order from{" "}
                      <span className="font-semibold">
                        {formatCurrency(st.minOrder)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Restaurant cards (similar style to station page) */}
                <div className="px-4 py-3">
                  {!hasRestros && (
                    <p className="text-xs text-gray-500">
                      No active restaurants at this station for the selected
                      train/date.
                    </p>
                  )}

                  {hasRestros && (
                    <div className="space-y-3">
                      {st.restros.map((r) => {
                        const restroSlug = makeRestroSlug(
                          r.restroCode,
                          r.restroName,
                        );
                        const targetHref = `/Stations/${stationSlug}/${restroSlug}`;

                        return (
                          <div
                            key={restroSlug}
                            className="flex items-center justify-between border rounded-md px-3 py-3 hover:shadow-sm transition-shadow"
                          >
                            <div>
                              <div className="text-sm font-semibold">
                                {r.restroName}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Train food delivery at {st.stationName},{" "}
                                {st.stationCode}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Min order{" "}
                                <span className="font-semibold">
                                  {formatCurrency(r.minimumOrder ?? st.minOrder)}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                window.location.href = targetHref;
                              }}
                              className="text-xs md:text-sm px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                            >
                              Order Now
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
      </main>
    </div>
  );
}
