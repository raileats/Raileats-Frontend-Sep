"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  StnNumber?: number | null;
  StationCode: string;
  StationName: string;
  Day?: number | null; // important for day offset
  arrivalTime?: string | null; // will map from Arrives/Departs
  Arrives?: string | null;
  Departs?: string | null;
  restroCount?: number;
  minOrder?: number | null;
  restros?: ApiRestro[];
  index?: number;
};

type ApiTrainSearchResponse = {
  ok: boolean;
  train?: {
    trainNumber: number | string | null;
    trainName: string | null;
    date?: string | null;
  };
  rows?: ApiStation[]; // full route rows when calling /api/train-routes?train=...
  stations?: ApiStation[]; // older responses
  meta?: any;
  error?: string;
};

function addDaysToIso(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtHHMM(hhmm?: string | null) {
  if (!hhmm) return "";
  const s = String(hhmm).trim();
  if (!s) return "";
  return s.slice(0, 5);
}

export default function TrainFoodPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = (params?.slug as string) || "";

  // slug format: 11016-train-food-delivery-in-train
  const trainNumberFromSlug = slug.split("-")[0];

  const queryDate = searchParams?.get("date") || "";
  const queryBoarding = searchParams?.get("boarding") || "";

  const [data, setData] = useState<ApiTrainSearchResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / selection state
  // If user came with ?date & ?boarding -> DO NOT show modal (they already selected)
  const shouldHideModal = Boolean(queryDate && queryBoarding);
  const [showModal, setShowModal] = useState<boolean>(() => !shouldHideModal);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (queryDate) return queryDate;
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [selectedBoardingCode, setSelectedBoardingCode] = useState<string | null>(() => {
    return queryBoarding || null;
  });

  // store boardingDay (Day value for boarding station) once we fetch route
  const [boardingDayValue, setBoardingDayValue] = useState<number | null>(null);

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

        // Call our train-route API which returns full route when no station param
        const url = `/api/train-routes?train=${encodeURIComponent(trainNumberFromSlug)}&date=${encodeURIComponent(
          selectedDate,
        )}`;

        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as ApiTrainSearchResponse;

        if (!res.ok || !json.ok) {
          setError(json.error || "Failed to load train details.");
          setData(null);
        } else {
          // The API returns rows (full route) in json.rows OR json.rows (mapped)
          const rows = (json.rows || json.stations || json.rows || []) as any[];

          // normalize station objects
          const stations: ApiStation[] = rows.map((r: any, i: number) => {
            // prefer Arrives then Departs for time
            const arrivalTime = (r.Arrives || r.Departs || "")?.slice(0, 5) || null;
            return {
              StnNumber: r.StnNumber ?? r.StnNumber,
              StationCode: (r.StationCode || "").toUpperCase(),
              StationName: r.StationName,
              Day: typeof r.Day !== "undefined" ? (Number(r.Day) || 0) : null,
              Arrives: r.Arrives ?? r.Arrival ?? null,
              Departs: r.Departs ?? null,
              arrivalTime,
              restroCount: r.restroCount ?? 0,
              minOrder: r.minOrder ?? null,
              index: i,
            } as ApiStation;
          });

          setData({ ...json, rows: stations, train: json.train || json.train });
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
  }, [trainNumberFromSlug, selectedDate]);

  // when data arrives, if query had boarding station, prefill boardingDayValue
  useEffect(() => {
    if (!data?.rows || !data.rows.length) return;
    if (!selectedBoardingCode) {
      setBoardingDayValue(null);
      return;
    }

    const found = data.rows.find((s: any) => (s.StationCode || "").toUpperCase() === selectedBoardingCode.toUpperCase());
    if (found && typeof found.Day !== "undefined" && found.Day !== null) {
      setBoardingDayValue(Number(found.Day));
    } else {
      setBoardingDayValue(null);
    }
  }, [data, selectedBoardingCode]);

  // When modal is open, preselect first logical station (old behaviour)
  useEffect(() => {
    if (!showModal && selectedBoardingCode) return;
    if (!data?.rows || data.rows.length === 0) return;

    // choose first station (but don't close; just prefill)
    const first = data.rows[0];
    if (first) {
      setSelectedBoardingCode((prev) => prev ?? first.StationCode);
    }
  }, [data, showModal]);

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

  // Compute filtered stations: only include stations at or after selected boarding station
  const filteredStations = useMemo(() => {
    if (!data?.rows) return [];
    if (!selectedBoardingCode) return data.rows;

    const idx = data.rows.findIndex((s) => (s.StationCode || "").toUpperCase() === selectedBoardingCode.toUpperCase());
    if (idx === -1) return data.rows;
    return data.rows.slice(idx).map((s: ApiStation, i: number) => ({ ...s, index: idx + i }));
  }, [data?.rows, selectedBoardingCode]);

  // Only stations with active restaurants — kept same logic as before but resilient if restros missing
  const stationsWithActiveRestros = useMemo(() => {
    return filteredStations
      .map((s) => ({
        ...s,
        restros: (s as any).restros || [],
        restroCount: (s as any).restroCount ?? ((s as any).restros ? (s as any).restros.length : 0),
      }))
      .filter((s) => (s.restros || []).length > 0);
  }, [filteredStations]);

  const firstActiveStation = stationsWithActiveRestros.length > 0 ? stationsWithActiveRestros[0] : null;

  const trainTitleNumber = (data?.train?.trainNumber ?? trainNumberFromSlug) || "Train";
  const trainTitleName = data?.train?.trainName ? ` – ${data.train.trainName}` : "";

  // helper: calculate arrival date for a station using Day offset
  const computeArrivalDateForStation = (station: ApiStation) => {
    // If API provided station.Day and boardingDayValue known → compute offset
    if (typeof station.Day === "number" && boardingDayValue != null && !isNaN(Number(station.Day))) {
      const diff = Number(station.Day) - Number(boardingDayValue);
      return addDaysToIso(selectedDate, diff);
    }

    // fallback: if station index present and data.rows have indices, try to compute by index diff
    try {
      const full = data?.rows || [];
      const boardingIndex = full.findIndex((s: any) => (s.StationCode || "").toUpperCase() === (selectedBoardingCode || "").toUpperCase());
      const stIndex = full.findIndex((s: any) => (s.StationCode || "").toUpperCase() === (station.StationCode || "").toUpperCase());
      if (boardingIndex !== -1 && stIndex !== -1) {
        const diff = stIndex - boardingIndex;
        // if negative (station before boarding) assume next day if diff < 0 -> add 1 day
        const daysToAdd = diff < 0 ? diff + 1 : diff;
        return addDaysToIso(selectedDate, daysToAdd);
      }
    } catch {
      // ignore
    }

    // final fallback: same selectedDate
    return selectedDate;
  };

  const formatArrivalWithDate = (arrival: string | null, dateIso: string) => {
    if (!arrival) return "-";
    return `${arrival} on ${dateIso}`;
  };

  const handleModalSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedBoardingCode) {
      alert("Please select boarding station.");
      return;
    }

    // close modal & update URL query so user can share
    setShowModal(false);
    const url = new URL(window.location.href);
    url.searchParams.set("date", selectedDate);
    url.searchParams.set("boarding", selectedBoardingCode);
    window.history.replaceState({}, "", url.toString());
  };

  const handleOrderNow = (restro: ApiRestro, station: ApiStation) => {
    const arrivalTime = station.arrivalTime ?? "";
    const arrivalDate = computeArrivalDateForStation(station);
    const qs = new URLSearchParams({
      station: station.StationCode,
      stationName: station.StationName || "",
      restro: String(restro.restroCode),
      restroName: String(restro.restroName || ""),
      train: String(trainTitleNumber),
      date: arrivalDate,
      arrivalTime,
    }).toString();

    const stationSlug = makeStationSlug(station.StationCode, station.StationName || "");
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
            <form onSubmit={handleModalSubmit} className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6">
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
                    {/* Use full route from API (data.rows) */}
                    {(data?.rows || []).map((s: any) => (
                      <option key={s.StationCode} value={s.StationCode}>
                        {s.StationName} ({s.StationCode}) {s.Day ? ` — day ${s.Day}` : ""}
                      </option>
                    ))}
                  </select>

                  <div className="text-xs text-gray-500 mt-2">
                    Dropdown shows full route from TrainRoute. Pick the station from where you'll board.
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
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
                  Arrival: {firstActiveStation.arrivalTime ?? "-"} on {computeArrivalDateForStation(firstActiveStation)}
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
            const stationSlug = makeStationSlug(st.StationCode, st.StationName || "");
            const arrivalDateForThisStation = computeArrivalDateForStation(st);

            return (
              <section
                key={`${st.StationCode}-${st.Arrives}-${st.index}`}
                className="mt-6 bg-white rounded-lg shadow-sm border"
              >
                {/* Station header row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3 border-b bg-gray-50">
                  <div>
                    <div className="text-sm font-semibold">
                      {st.StationName}{" "}
                      <span className="text-xs text-gray-500">({st.StationCode})</span>
                      {st.Day ? <span className="text-xs text-gray-500"> — Day {st.Day}</span> : null}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Arrival: {st.arrivalTime ?? "-"} on {arrivalDateForThisStation}
                    </div>
                  </div>

                  <div className="mt-2 md:mt-0 text-xs text-right text-gray-600">
                    <div>
                      Active restaurants: <span className="font-semibold">{st.restroCount ?? (st.restros?.length ?? 0)}</span>
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
                      {st.restros!.map((r) => {
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
                                Delivery when train arrives: {st.arrivalTime ?? "-"} on {arrivalDateForThisStation}
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
