// app/trains/[slug]/page.tsx
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
  category?: string;
  rating?: number | null;
  isActive?: boolean;
};

type ApiStation = {
  StnNumber?: number | null;
  StationCode: string;
  StationName: string;
  Day?: number | null;
  arrivalTime?: string | null;
  Arrives?: string | null;
  Departs?: string | null;
  restroCount?: number | null;
  minOrder?: number | null;
  restros?: ApiRestro[];
  index?: number;
  arrivalDate?: string | null;
  blockedReasons?: string[];
};

type ApiTrainSearchResponse = {
  ok: boolean;
  train?: {
    trainNumber?: number | string | null;
    trainName?: string | null;
    date?: string | null;
  };
  rows?: any[];
  stations?: any[];
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

export default function TrainFoodPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = (params?.slug as string) || "";
  const trainNumberFromSlug = slug.split("-")[0] || "";

  // query params (if user arrived with ?date & ?boarding)
  const queryDate = searchParams?.get("date") || "";
  const queryBoarding = searchParams?.get("boarding") || "";

  const [data, setData] = useState<ApiTrainSearchResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // modal shown only when user hasn't provided date+boarding
  const shouldHideModal = Boolean(queryDate && queryBoarding);
  const [showModal, setShowModal] = useState<boolean>(() => !shouldHideModal);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (queryDate) return queryDate;
    return new Date().toISOString().slice(0, 10);
  });
  const [selectedBoardingCode, setSelectedBoardingCode] = useState<string | null>(() => {
    return queryBoarding || null;
  });

  // boarding day offset (if API provides Day fields)
  const [boardingDayValue, setBoardingDayValue] = useState<number | null>(null);

  // Fetch route from API
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

        // include boarding param (server may use it to filter / compute)
        const url =
          `/api/train-routes?train=${encodeURIComponent(trainNumberFromSlug)}` +
          `&date=${encodeURIComponent(selectedDate)}` +
          (selectedBoardingCode ? `&boarding=${encodeURIComponent(selectedBoardingCode)}` : "");

        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as ApiTrainSearchResponse;

        if (!res.ok || !json.ok) {
          setError(json.error || "Failed to load train details.");
          setData(null);
          setLoading(false);
          return;
        }

        // defensive: server could send `rows` or `stations`
        const rows = (json.rows || json.stations || []) as any[];

        // normalize station objects and restros
        const stations: ApiStation[] = rows.map((r: any, i: number) => {
          const arrivalTime = (r.Arrives || r.Departs || r.arrivalTime || "")?.slice?.(0, 5) || null;

          const restrosRaw: any[] = r.restros || r.restaurants || r.outlets || [];
          const restros: ApiRestro[] = (restrosRaw || []).map((rr: any) => ({
            restroCode: rr.RestroCode ?? rr.restro_code ?? rr.code ?? rr.id,
            restroName: rr.RestroName ?? rr.restroName ?? rr.name ?? "",
            minimumOrder: rr.MinimumOrdermValue ?? rr.minimumOrder ?? rr.minOrder ?? null,
            openTime: rr.OpenTime ?? rr.openTime ?? rr.open_at ?? null,
            closeTime: rr.ClosedTime ?? rr.closeTime ?? rr.close_at ?? null,
            category: rr.category ?? rr.food_type ?? undefined,
            rating: rr.RestroRating ?? rr.rating ?? null,
            isActive: typeof rr.isActive !== "undefined" ? rr.isActive : rr.active ?? true,
          }));

          const blockedReasons: string[] =
            Array.isArray(r.blockedReasons) ? r.blockedReasons : r.blockedReasons ? [String(r.blockedReasons)] : [];

          return {
            StnNumber: r.StnNumber ?? r.stn_number ?? null,
            StationCode: String((r.StationCode ?? r.station_code ?? r.code ?? "")).toUpperCase(),
            StationName: String(r.StationName ?? r.station_name ?? r.name ?? ""),
            Day: typeof r.Day === "number" ? Number(r.Day) : typeof r.day === "number" ? Number(r.day) : null,
            Arrives: r.Arrives ?? r.arrival ?? null,
            Departs: r.Departs ?? r.departure ?? null,
            arrivalTime,
            restroCount: r.restroCount ?? (restros ? restros.length : 0),
            minOrder: r.minOrder ?? r.MinimumOrdermValue ?? null,
            restros,
            index: i,
            arrivalDate: r.arrivalDate ?? null,
            blockedReasons,
          } as ApiStation;
        });

        setData({ ...json, rows: stations });
      } catch (e) {
        console.error("train page fetch error", e);
        setError("Failed to load train details.");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [trainNumberFromSlug, selectedDate, selectedBoardingCode]);

  // if boarding station selected, set boardingDayValue from rows (if present)
  useEffect(() => {
    if (!data?.rows || data.rows.length === 0) return;
    if (!selectedBoardingCode) {
      setBoardingDayValue(null);
      return;
    }
    const found = data.rows.find((s) => (s.StationCode || "").toUpperCase() === selectedBoardingCode.toUpperCase());
    if (found && typeof found.Day === "number") setBoardingDayValue(Number(found.Day));
    else setBoardingDayValue(null);
  }, [data, selectedBoardingCode]);

  // preselect first station when modal shown (old behaviour)
  useEffect(() => {
    if (!showModal && selectedBoardingCode) return;
    if (!data?.rows || data.rows.length === 0) return;
    const first = data.rows[0];
    if (first) setSelectedBoardingCode((prev) => prev ?? first.StationCode);
  }, [data, showModal]);

  const formatCurrency = (val?: number | null) => {
    if (val == null || Number.isNaN(Number(val))) return "-";
    return `₹${Number(val).toFixed(0)}`;
  };

  const makeRestroSlug = (code: string | number, name: string) => {
    const cleanName = String(name || "")
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    return `${code}-${encodeURIComponent(cleanName)}`;
  };

  // slice route from boarding inclusive (if boarding selected)
  const filteredStations = useMemo(() => {
    if (!data?.rows) return [];
    if (!selectedBoardingCode) return data.rows;
    const idx = data.rows.findIndex((s) => (s.StationCode || "").toUpperCase() === selectedBoardingCode.toUpperCase());
    if (idx === -1) return data.rows;
    return data.rows.slice(idx).map((s, i) => ({ ...s, index: idx + i }));
  }, [data?.rows, selectedBoardingCode]);

  // Only keep stations that actually have restros (server-side mapped outlets)
  const stationsWithActiveRestros = useMemo(() => {
    return filteredStations
      .map((s) => ({
        ...s,
        restros: (s.restros || []).filter((r) => (typeof r.isActive === "boolean" ? r.isActive : true)),
        restroCount: s.restroCount ?? ((s.restros && s.restros.length) || 0),
      }))
      .filter((s) => (s.restros || []).length > 0);
  }, [filteredStations]);

  // first active station (after boarding) for summary
  const firstActiveStation = stationsWithActiveRestros.length > 0 ? stationsWithActiveRestros[0] : null;

  const trainTitleNumber = (data?.train?.trainNumber ?? trainNumberFromSlug) || "Train";
  const trainTitleName = data?.train?.trainName ? ` – ${data.train.trainName}` : "";

  const computeArrivalDateForStation = (station: ApiStation) => {
    if (station.arrivalDate) return station.arrivalDate;
    if (typeof station.Day === "number" && boardingDayValue != null) {
      const diff = Number(station.Day) - Number(boardingDayValue);
      return addDaysToIso(selectedDate, diff);
    }
    return station.arrivalDate ?? selectedDate;
  };

  const handleModalSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedBoardingCode) {
      alert("Please select boarding station.");
      return;
    }
    setShowModal(false);
    const url = new URL(window.location.href);
    url.searchParams.set("date", selectedDate);
    url.searchParams.set("boarding", selectedBoardingCode);
    window.history.replaceState({}, "", url.toString());
    // selectedBoardingCode change triggers refetch via effect
  };

  const handleOrderNow = (restro: ApiRestro, station: ApiStation) => {
    const arrivalTime = station.arrivalTime ?? "";
    const arrivalDate = computeArrivalDateForStation(station);
    const qs = new URLSearchParams({
      station: station.StationCode,
      stationName: station.StationName || "",
      restro: String((restro as any).restroCode ?? ""),
      restroName: String((restro as any).restroName ?? ""),
      train: String(trainTitleNumber),
      date: arrivalDate,
      arrivalTime,
    }).toString();

    const stationSlug = makeStationSlug(station.StationCode, station.StationName || "");
    const restroSlug = makeRestroSlug((restro as any).restroCode ?? "", (restro as any).restroName ?? "");
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
                    <option value="" disabled>Select boarding station</option>
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
                <button type="button" onClick={() => (window.location.href = "/")} className="px-4 py-2 rounded border">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-green-600 text-white">Search & Open</button>
              </div>
            </form>
          </div>
        )}

        {/* If no active restros after boarding, show reasons box */}
        {!error && !firstActiveStation && !loading && (
          <div className="p-4 bg-gray-50 rounded text-sm text-gray-700">
            <p>No active restaurants found for the selected boarding station / date.</p>
            <ul className="mt-2 text-xs text-gray-600 space-y-1">
              <li>• No vendor mapped at station (server-side).</li>
              <li>• Vendor is closed / Weekly off on selected date.</li>
              <li>• Vendor on holiday or temporarily disabled.</li>
              <li>• Menu/outlet disabled by admin.</li>
              <li>• Server failed to fetch admin data (internal error).</li>
            </ul>
            <div className="mt-2 text-xs text-gray-500">
              Tip: open browser devtools → Network → filter `train-routes` to see server response & possible blockedReasons.
            </div>
          </div>
        )}

        {/* Summary for first active station */}
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
                <div>Active restaurants: <span className="font-semibold">{firstActiveStation.restroCount}</span></div>
                <div className="mt-1">Min. order: <span className="font-semibold">{formatCurrency(firstActiveStation.minOrder)}</span></div>
              </div>
            </div>
          </section>
        )}

        {/* Stations list (from boarding onward) */}
        {!error && (selectedBoardingCode ? filteredStations : data?.rows || []).map((st) => {
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
                  {st.blockedReasons && st.blockedReasons.length ? (
                    <div className="text-xs text-rose-600 mt-1">Info: {st.blockedReasons.join("; ")}</div>
                  ) : null}
                </div>

                <div className="mt-2 md:mt-0 text-xs text-right text-gray-600">
                  <div>Active restaurants: <span className="font-semibold">{st.restroCount ?? (st.restros?.length ?? 0)}</span></div>
                  <div className="mt-1">Min. order from <span className="font-semibold">{formatCurrency(st.minOrder ?? (st.restros?.[0]?.minimumOrder ?? null))}</span></div>
                </div>
              </div>

              <div className="px-4 py-3">
                {!hasRestros && <p className="text-xs text-gray-500">No active restaurants at this station for the selected train/date.</p>}

                {hasRestros && (
                  <div className="space-y-3">
                    {st.restros!.map((r: any) => {
                      const restroSlug = makeRestroSlug(r.restroCode ?? (r as any).RestroCode, r.restroName ?? r.RestroName);
                      return (
                        <div key={restroSlug} className="flex items-center justify-between border rounded-md px-3 py-3 hover:shadow-sm transition-shadow">
                          <div>
                            <div className="text-sm font-semibold">{r.restroName ?? r.RestroName}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Open: {r.openTime ?? "—"} — {r.closeTime ?? "—"} • Min {formatCurrency(r.minimumOrder ?? r.MinimumOrdermValue ?? st.minOrder)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Delivery when train arrives: {st.arrivalTime ?? "-"} on {arrivalDateForThisStation}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => handleOrderNow(r, st)} className="text-xs md:text-sm px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">Order Now</button>
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
