"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { makeStationSlug } from "../../lib/stationSlug";

type ApiRestro = {
  restroCode: number | string;
  restroName: string;
  minimumOrder?: number | null;
  openTime?: string | null;
  closeTime?: string | null;
  category?: string | null;
  rating?: number | null;
  isActive?: boolean;
};

type ApiStation = {
  StnNumber?: number | null;
  StationCode: string;
  StationName: string;
  Day?: number | null;
  Arrives?: string | null;
  Departs?: string | null;
  arrivalTime?: string | null; // normalized HH:MM
  restroCount?: number;
  minOrder?: number | null;
  restros?: ApiRestro[];
  index?: number;
};

type ApiTrainSearchResponse = {
  ok: boolean;
  train?: {
    trainNumber?: number | string | null;
    trainName?: string | null;
    date?: string | null;
  };
  rows?: any[]; // raw rows from API
  error?: string | null;
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

  // boardingDayValue resolved from route rows (if available)
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

        // fetch full route (API returns rows when station param not provided)
        const url = `/api/train-routes?train=${encodeURIComponent(trainNumberFromSlug)}&date=${encodeURIComponent(
          selectedDate,
        )}`;

        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as ApiTrainSearchResponse;

        if (!res.ok || !json.ok) {
          setError(json.error || "Failed to load train details.");
          setData(null);
        } else {
          // normalise rows into ApiStation[]
          const rawRows = (json.rows || json.rows || []) as any[];
          const stations: ApiStation[] = rawRows.map((r: any, i: number) => {
            const arrives = r.Arrives ?? r.arrival ?? null;
            const departs = r.Departs ?? null;
            const arrivalTime = fmtHHMM(arrives || departs || null) || null;
            return {
              StnNumber: r.StnNumber ?? null,
              StationCode: (r.StationCode || "").toUpperCase(),
              StationName: r.StationName ?? r.stationName ?? "",
              Day: typeof r.Day !== "undefined" && r.Day !== null ? Number(r.Day) : null,
              Arrives: arrives ?? null,
              Departs: departs ?? null,
              arrivalTime,
              restroCount: r.restroCount ?? 0,
              minOrder: r.minOrder ?? null,
              restros: r.restros ?? [],
              index: i,
            } as ApiStation;
          });

          setData({
            ok: true,
            train: json.train ?? { trainNumber: trainNumberFromSlug, trainName: rawRows[0]?.trainName ?? null },
            rows: stations,
          });
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

  // when data arrives, set boardingDayValue if boarding station present
  useEffect(() => {
    if (!data?.rows || !data.rows.length) return;
    if (!selectedBoardingCode) {
      setBoardingDayValue(null);
      return;
    }

    const found = (data.rows as ApiStation[]).find(
      (s) => (s.StationCode || "").toUpperCase() === (selectedBoardingCode || "").toUpperCase(),
    );
    if (found && typeof found.Day !== "undefined" && found.Day !== null) {
      setBoardingDayValue(Number(found.Day));
    } else {
      setBoardingDayValue(null);
    }
  }, [data, selectedBoardingCode]);

  // When modal open, prefill first station if none selected
  useEffect(() => {
    if (!showModal && selectedBoardingCode) return;
    if (!data?.rows || data.rows.length === 0) return;

    const first = (data.rows as ApiStation[])[0];
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

  // filteredStations: stations at or after boarding (but keep all if boarding not chosen)
  const filteredStations = useMemo(() => {
    const rows = (data?.rows as ApiStation[]) || [];
    if (!selectedBoardingCode) return rows;
    const idx = rows.findIndex((s) => (s.StationCode || "").toUpperCase() === selectedBoardingCode.toUpperCase());
    if (idx === -1) return rows;
    return rows.slice(idx).map((s, i) => ({ ...s, index: idx + i }));
  }, [data?.rows, selectedBoardingCode]);

  // TEMP: show all filtered stations (do not filter by restros). This helps debug and prevents "no active" blank page.
  const stationsToShow = useMemo(() => {
    return (filteredStations || []).map((s) => ({
      ...s,
      restros: s.restros ?? [],
      restroCount: s.restroCount ?? (s.restros ? s.restros.length : 0),
    }));
  }, [filteredStations]);

  // find first station that actually has restros (for summary). If none, fallback to first station.
  const firstActiveStation =
    stationsToShow.find((s) => (s.restros || []).length > 0) ?? (stationsToShow.length ? stationsToShow[0] : null);

  const trainTitleNumber = (data?.train?.trainNumber ?? trainNumberFromSlug) || "Train";
  const trainTitleName = data?.train?.trainName ? ` – ${data.train!.trainName}` : "";

  // helper: compute arrival date for a station using Day offsets
  const computeArrivalDateForStation = (station: ApiStation) => {
    if (!selectedDate) return selectedDate;

    // If station.Day and boardingDayValue available -> use difference
    if (typeof station.Day === "number" && boardingDayValue != null) {
      const diff = Number(station.Day) - Number(boardingDayValue);
      return addDaysToIso(selectedDate, diff);
    }

    // fallback: use index diff if possible
    try {
      const full = (data?.rows as ApiStation[]) || [];
      const boardingIndex = full.findIndex((s) => (s.StationCode || "").toUpperCase() === (selectedBoardingCode || "").toUpperCase());
      const stIndex = full.findIndex((s) => (s.StationCode || "").toUpperCase() === (station.StationCode || "").toUpperCase());
      if (boardingIndex !== -1 && stIndex !== -1) {
        const diff = stIndex - boardingIndex;
        const daysToAdd = diff < 0 ? diff + 1 : diff;
        return addDaysToIso(selectedDate, daysToAdd);
      }
    } catch {
      // ignore
    }

    return selectedDate;
  };

  const handleModalSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedBoardingCode) {
      alert("Please select boarding station.");
      return;
    }

    // hide modal and update URL query params
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
        <h1 className="text-2xl md:text-3xl font-semibold mb-1">
          Train {trainTitleNumber}
          {trainTitleName}
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Food delivery stations & restaurants available on this train. Choose journey date and boarding station first.
        </p>

        {/* Modal */}
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
                    {(data?.rows || []).map((s: ApiStation) => (
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

        {/* Error */}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* No active restaurants message (if truly none) */}
        {!error && !firstActiveStation && !loading && (
          <p className="text-sm text-gray-500">No active restaurants found for the selected boarding station / date.</p>
        )}

        {/* Summary block */}
        {!error && firstActiveStation && (
          <section className="mb-6 bg-white rounded-lg shadow-sm border p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <div className="text-sm font-semibold">
                  First active station: {firstActiveStation.StationName}{" "}
                  <span className="text-xs text-gray-500">({firstActiveStation.StationCode})</span>
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

        {/* Stations list (temporary: show all filtered stations) */}
        {!error &&
          stationsToShow.map((st) => {
            const hasRestros = (st.restros || []).length > 0;
            const stationSlug = makeStationSlug(st.StationCode, st.StationName || "");
            const arrivalDateForThisStation = computeArrivalDateForStation(st);

            return (
              <section key={`${st.StationCode}-${st.Arrives}-${st.index}`} className="mt-6 bg-white rounded-lg shadow-sm border">
                <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3 border-b bg-gray-50">
                  <div>
                    <div className="text-sm font-semibold">
                      {st.StationName} <span className="text-xs text-gray-500">({st.StationCode})</span>
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
                      Min. order from <span className="font-semibold">{formatCurrency(st.minOrder ?? (st.restros?.[0]?.minimumOrder ?? null))}</span>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3">
                  {!hasRestros && <p className="text-xs text-gray-500">No active restaurants at this station for the selected train/date.</p>}

                  {hasRestros && (
                    <div className="space-y-3">
                      {st.restros!.map((r) => {
                        const restroSlug = makeRestroSlug(r.restroCode, r.restroName);
                        return (
                          <div key={restroSlug} className="flex items-center justify-between border rounded-md px-3 py-3 hover:shadow-sm transition-shadow">
                            <div>
                              <div className="text-sm font-semibold">{r.restroName}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                Open: {r.openTime ?? "—"} — {r.closeTime ?? "—"} • Min {formatCurrency(r.minimumOrder ?? st.minOrder)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Category: {r.category ?? "—"} • Rating: {r.rating ?? "—"}</div>
                              <div className="text-xs text-gray-500 mt-1">Delivery when train arrives: {st.arrivalTime ?? "-"} on {arrivalDateForThisStation}</div>
                            </div>

                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => handleOrderNow(r, st)} className="text-xs md:text-sm px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">
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
