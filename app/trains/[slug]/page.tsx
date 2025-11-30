// app/trains/[slug]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { makeStationSlug } from "../../lib/stationSlug";

type ApiRestro = {
  restroCode: number;
  name: string;
  minOrder: number | null;
  isVeg: boolean | null;
  isNonVeg: boolean | null;
  rating: number | null;
  openTime: string | null;
  closeTime: string | null;
};

type ApiStation = {
  stationCode: string;
  stationName: string;
  arrivalHHMM: string;
  activeRestrosCount: number;
  minOrderAmongRestros: number | null;
  restros: ApiRestro[];
};

type ApiResponse = {
  ok: boolean;
  train: {
    trainNumber: string | number;
    trainName: string | null;
  };
  stations: ApiStation[];
  error?: string;
};

export default function TrainFoodPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "";

  // slug se sirf train number nikaalo (pehla part, 11016-… → 11016)
  const trainNumberFromSlug = (() => {
    if (!slug) return "";
    const firstPart = slug.split("-")[0];
    return firstPart || slug;
  })();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!trainNumberFromSlug) {
      setError("Invalid train number.");
      setLoading(false);
      return;
    }

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
        if (!res.ok || !json.ok) {
          setError(json.error || "Failed to load data.");
          setData(null);
        } else {
          setData(json);
        }
      } catch (e) {
        console.error("Train food page fetch error:", e);
        setError("Something went wrong while loading data.");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [trainNumberFromSlug]);

  // ❗ yahan parens add kiye gaye hain (build error fix)
  const trainTitleNumber =
    (data?.train?.trainNumber ?? trainNumberFromSlug) || "Train";

  const trainTitleName = data?.train?.trainName
    ? ` – ${data.train.trainName}`
    : "";

  // sirf wahi stations jahan active restros > 0
  const stationsWithRestros: ApiStation[] =
    data?.stations?.filter((s) => (s.activeRestrosCount || 0) > 0) ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Back link */}
      <div className="mb-4">
        <a href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to Home
        </a>
      </div>

      {/* Header */}
      <h1 className="text-2xl font-semibold mb-1">
        Train {trainTitleNumber}
        {trainTitleName}
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        Food delivery stations &amp; restaurants available on this train.
      </p>

      {/* Loading / error states */}
      {loading && (
        <p className="text-sm text-gray-500">Loading train information…</p>
      )}

      {!loading && error && (
        <p className="text-sm text-red-600">Error: {error}</p>
      )}

      {!loading && !error && stationsWithRestros.length === 0 && (
        <p className="text-sm text-gray-500">
          No active restaurants found on this train yet.
        </p>
      )}

      {/* STATIONS LIST */}
      {!loading &&
        !error &&
        stationsWithRestros.length > 0 &&
        stationsWithRestros.map((st) => {
          const stationSlug = makeStationSlug(
            st.stationCode,
            st.stationName || "",
          );
          const restros = st.restros || [];

          return (
            <section
              key={st.stationCode}
              className="bg-white rounded-xl shadow-sm border mb-6"
            >
              {/* Station banner (similar feel to Stations page) */}
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-lg font-semibold">
                      {st.stationCode} – {st.stationName}
                    </h2>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Arrival time:{" "}
                    {st.arrivalHHMM ? st.arrivalHHMM : "N/A"} •{" "}
                    {st.activeRestrosCount}{" "}
                    {st.activeRestrosCount === 1
                      ? "restaurant found"
                      : "restaurants found"}
                  </div>
                </div>

                <div className="text-right text-xs text-gray-500">
                  {st.minOrderAmongRestros != null &&
                    st.minOrderAmongRestros > 0 && (
                      <div>
                        Min. order from ₹{st.minOrderAmongRestros}
                      </div>
                    )}
                  <a
                    href={`/Stations/${stationSlug}`}
                    className="inline-block mt-1 text-xs text-blue-600 hover:underline"
                  >
                    View all restaurants at this station →
                  </a>
                </div>
              </div>

              {/* Restro cards (similar to station page card style) */}
              <div className="p-4 space-y-3">
                {restros.map((r) => {
                  const vegDot =
                    r.isVeg && !r.isNonVeg
                      ? "Veg"
                      : !r.isVeg && r.isNonVeg
                      ? "Non-Veg"
                      : r.isVeg && r.isNonVeg
                      ? "Veg & Non-Veg"
                      : "";

                  return (
                    <div
                      key={r.restroCode}
                      className="flex items-center justify-between border rounded-lg px-3 py-3 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {r.name}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                          {r.rating != null && r.rating > 0 && (
                            <span>Rating: {r.rating.toFixed(1)}</span>
                          )}
                          {vegDot && (
                            <span className="flex items-center gap-1">
                              <span className="inline-block w-2 h-2 rounded-full bg-green-600" />
                              {vegDot}
                            </span>
                          )}
                          {r.openTime && r.closeTime && (
                            <span>
                              {r.openTime} to {r.closeTime}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="ml-4 text-right">
                        {r.minOrder != null && r.minOrder > 0 && (
                          <div className="text-xs text-gray-700 mb-1">
                            Min order{" "}
                            <span className="font-semibold">₹{r.minOrder}</span>
                          </div>
                        )}

                        <a
                          href={`/Stations/${stationSlug}`}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Order Now
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
    </div>
  );
}
