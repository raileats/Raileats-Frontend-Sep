"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { makeStationSlug } from "../../lib/stationSlug";

type ApiRestro = {
  restroCode: number | string;
  restroName: string;
  minimumOrder: number | null;
  openTime?: string | null; // "HH:MM" or null
  closeTime?: string | null;
  category?: "veg" | "non-veg" | "both" | string;
  rating?: number | null;
  isActive?: boolean;
};

type ApiStation = {
  stationCode: string;
  stationName: string;
  state?: string | null;
  arrivalTime: string | null; // "HH:MM" or null
  restroCount: number;
  minOrder: number | null;
  restros: ApiRestro[];
  index?: number; // position in route
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

  // Modal / selection state
  const [showModal, setShowModal] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [selectedBoardingCode, setSelectedBoardingCode] = useState<string | null>(null);

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
          `/api/home/train-search?train=${encodeURIComponent(trainNumberFromSlug)}`,
          { cache: "no-store" },
        );

        const json = (await res.json()) as ApiTrainSearchResponse;

        if (!res.ok || !json.ok) {
          setError(json.error || "Failed to load train details.");
          setData(null);
        } else {
          // ensure stations have index
          const stations = (json.stations || []).map((s, i) => ({ ...s, index: i }));
          setData({ ...json, stations });
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

  // When data arrives, prefill boarding station if not set
  useEffect(() => {
    if (!data?.stations || data.stations.length === 0) return;
    const first = data.stations[0];
    if (first && !selectedBoardingCode) {
      setSelectedBoardingCode(first.stationCode);
    }
  }, [data?.stations]);

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

  // Filter stations: only include stations at or after selected boarding station
  const filteredStations = useMemo(() => {
    if (!data?.stations) return [];
    if (!selectedBoardingCode) return data.stations;

    const idx = data.stations.findIndex((s) => s.stationCode === selectedBoardingCode);
    if (idx === -1) return data.stations;
    // only stations from idx to end
    return data.stations.slice(idx).map((s, i) => ({ ...s, index: idx + i }));
  }, [data?.stations, selectedBoardingCode]);

  // From filteredStations, pick only stations that have active restaurants
  const stationsWithActiveRestros = useMemo(() => {
    return filteredStations
      .map((s) => ({
        ...s,
        restros: (s.restros || []).filter((r) => r.isActive !== false),
        restroCount: (s.restros || []).filter((r) => r.isActive !== false).length,
      }))
      .filter((s) => (s.restros || []).length > 0);
  }, [filteredStations]);

  // first active station (for header summary)
  const firstActiveStation = stationsWithActiveRestros.length > 0 ? stationsWithActiveRestros[0] : null;

  const trainTitleNumber = (data?.train?.trainNumber ?? trainNumberFromSlug) || "Train";
  const trainTitleName = data?.train?.trainName ? ` – ${data.train.trainName}` : "";

  const handleModalSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedBoardingCode) {
      alert("Please select boarding station.");
      return;
    }

    // find boarding station details
    const boardingStation = (data?.stations || []).find((s) => s.stationCode === selectedBoardingCode) || null;
    const arrivalTime = boardingStation?.arrivalTime ?? "";

    // Build outlet meta object compatible with station flow (checkout reads this)
    const outletMeta: any = {
      stationCode: selectedBoardingCode,
      stationName: boardingStation?.stationName ?? "",
      state: boardingStation?.state ?? "",
      // restro placeholders — menu page will update these when user opens a restaurant
      restroCode: null,
      RestroCode: null,
      outletName: "",
      // train specific fields:
      trainNumber: String(trainTitleNumber),
      trainName: data?.train?.trainName ?? "",
      journeyDate: selectedDate, // yyyy-mm-dd
      arrivalTime, // "HH:MM"
      // mark source so checkout can detect
      source: "train",
    };

    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("raileats_current_outlet", JSON.stringify(outletMeta));
        localStorage.setItem("re_lastSearchType", "train");
        localStorage.setItem("re_lastTrainNumber", String(trainTitleNumber));
      }
    } catch (err) {
      console.warn("sessionStorage/localStorage write failed", err);
    }

    // close modal & keep selections for page rendering
    setShowModal(false);

    // update URL query so page is shareable
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("date", selectedDate);
      url.searchParams.set("boarding", selectedBoardingCode);
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore
    }
  };

  const handleOrderNow = (restro: ApiRestro, station: ApiStation) => {
    // Pass enough context to menu page so it can filter items by arrivalTime and date
    const arrivalTime = station.arrivalTime ?? "";
    const qs = new URLSearchParams({
      station: station.stationCode,
      stationName: station.stationName,
      restro: String(restro.restroCode),
      restroName: restro.restroName,
      train: String(trainTitleNumber),
      date: selectedDate,
      arrivalTime,
    }).toString();

    // menu page route: /Stations/[stationSlug]/[restroSlug]?...
    const stationSlug = makeStationSlug(station.stationCode, station.stationName);
    const restroSlug = makeRestroSlug(restro.restroCode, restro.restroName);

    router.push(`/Stations/${stationSlug}/${restroSlug}?${qs}`);
  };

  // Loading / error states
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading train details…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Train heading */}
        <h1 className="text-2xl md:text-3xl font-semibold mb-1">
          Train {trainTitleNumber}
          {trainTitleName}
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Food delivery stations & restaurants available on this train. Choose journey date and boarding station first.
        </p>

        {/* If modal is open, block interaction with page (modal overlays) */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <form
              onSubmit={handleModalSubmit}
              className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6"
            >
              <div className="mb-4">
                <div className="text-sm text-gray-500">Train</div>
                <div className="text-lg font-semibold">
                  {trainTitleNumber}
                  {trainTitleName}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Journey date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Boarding station</label>
                  <select
                    value={selectedBoardingCode ?? ""}
                    onChange={(e) => setSelectedBoardingCode(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="" disabled>
                      Select boarding station
                    </option>
                    {(data?.stations || []).map((s) => (
                      <option key={s.stationCode} value={s.stationCode}>
                        {s.stationName} ({s.stationCode}) {s.state ? `- ${s.state}` : ""}
                      </option>
                    ))}
                  </select>

                  <div className="text-xs text-gray-500 mt-2">
                    Tip: pick the station from where you'll board. After submit you'll see only active restaurants from this station and subsequent stations where the train stops.
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    // allow user to go back to home instead of selecting
                    window.location.href = "/";
                  }}
                  className="px-4 py-2 rounded border"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded bg-green-600 text-white">
                  Search & Open
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Error or no-stations */}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!error && !firstActiveStation && !loading && (
          <p className="text-sm text-gray-500">No active restaurants found for the selected boarding station / date.</p>
        )}

        {/* If we have a first active station, show summary block */}
        {!error && firstActiveStation && (
          <section className="mb-6 bg-white rounded-lg shadow-sm border p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <div className="text-sm font-semibold">
                  First active station: {firstActiveStation.stationName}{" "}
                  <span className="text-xs text-gray-500">({firstActiveStation.stationCode})</span>
                  {firstActiveStation.state ? (
                    <span className="text-xs text-gray-500"> — {firstActiveStation.state}</span>
                  ) : null}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Arrival: {firstActiveStation.arrivalTime ?? "-"} on {selectedDate}
                </div>
              </div>

              <div className="mt-3 md:mt-0 text-right text-xs text-gray-600">
                <div>
                  Active restaurants: <span className="font-semibold">{firstActiveStation.restroCount}</span>
                </div>
                <div className="mt-1">
                  Min. order: <span className="font-semibold">{formatCurrency(firstActiveStation.minOrder)}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* List stations with restaurants */}
        {!error &&
          stationsWithActiveRestros.map((st) => {
            const hasRestros = (st.restros || []).length > 0;
            const stationSlug = makeStationSlug(st.stationCode, st.stationName);

            return (
              <section
                key={`${st.stationCode}-${st.arrivalTime}-${st.index}`}
                className="mt-6 bg-white rounded-lg shadow-sm border"
              >
                {/* Station header row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3 border-b bg-gray-50">
                  <div>
                    <div className="text-sm font-semibold">
                      {st.stationName}{" "}
                      <span className="text-xs text-gray-500">({st.stationCode})</span>
                      {st.state ? <span className="text-xs text-gray-500"> — {st.state}</span> : null}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Arrival: {st.arrivalTime ?? "-"} on {selectedDate}
                    </div>
                  </div>

                  <div className="mt-2 md:mt-0 text-xs text-right text-gray-600">
                    <div>
                      Active restaurants: <span className="font-semibold">{st.restroCount ?? st.restros.length}</span>
                    </div>
                    <div className="mt-1">
                      Min. order from{" "}
                      <span className="font-semibold">
                        {formatCurrency(st.minOrder ?? (st.restros?.[0]?.minimumOrder ?? null))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Restaurant cards */}
                <div className="px-4 py-3">
                  {!hasRestros && (
                    <p className="text-xs text-gray-500">No active restaurants at this station for the selected train/date.</p>
                  )}

                  {hasRestros && (
                    <div className="space-y-3">
                      {st.restros.map((r) => {
                        const restroSlug = makeRestroSlug(r.restroCode, r.restroName);
                        return (
                          <div
                            key={restroSlug}
                            className="flex items-center justify-between border rounded-md px-3 py-3 hover:shadow-sm transition-shadow"
                          >
                            <div>
                              <div className="text-sm font-semibold">{r.restroName}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                Open: {r.openTime ?? "—"} — {r.closeTime ?? "—"} • Min {formatCurrency(r.minimumOrder ?? st.minOrder)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Category: {r.category ?? "—"} • Rating: {r.rating ?? "—"}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Delivery when train arrives: {st.arrivalTime ?? "-"} on {selectedDate}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleOrderNow(r, st)}
                                className="text-xs md:text-sm px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                              >
                                Order Now
                              </button>
                            </div>
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
