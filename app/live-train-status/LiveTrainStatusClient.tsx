"use client";

import { useMemo, useState } from "react";

function digitsOnly(value: string) {
  return String(value || "").replace(/\D/g, "").slice(0, 5);
}

function safe(value: any, fallback = "N/A") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function titleCase(value: any) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: any) {
  const text = String(value ?? "").trim();
  if (!text) return "N/A";
  return text;
}

function formatTime(value: any) {
  const text = String(value ?? "").trim();
  return text || "N/A";
}

function delayBadge(delayStatus: any) {
  const text = String(delayStatus ?? "").trim();
  const lower = text.toLowerCase();

  if (!text) {
    return {
      label: "Status N/A",
      className: "bg-slate-100 text-slate-700 border-slate-200",
    };
  }

  if (lower.includes("delay")) {
    return {
      label: text,
      className: "bg-red-50 text-red-700 border-red-200",
    };
  }

  if (lower.includes("on time") || lower.includes("ontime")) {
    return {
      label: "On Time",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }

  return {
    label: text,
    className: "bg-blue-50 text-blue-700 border-blue-200",
  };
}

function getCurrentIndex(stations: any[], data: any) {
  const currentFromFlag = stations.findIndex(
    (station) => station?.is_current || station?.is_live_station
  );

  if (currentFromFlag >= 0) return currentFromFlag;

  const currentCode = String(
    data?.current_station_code || data?.current_station || ""
  )
    .trim()
    .toUpperCase();

  if (!currentCode) return -1;

  return stations.findIndex(
    (station) => String(station?.code || "").trim().toUpperCase() === currentCode
  );
}

function getProgress(currentIndex: number, total: number) {
  if (total <= 1 || currentIndex < 0) return 0;
  return Math.min(100, Math.max(0, Math.round((currentIndex / (total - 1)) * 100)));
}

export default function LiveTrainStatusClient() {
  const [train, setTrain] = useState("");
  const [day, setDay] = useState("0");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const data = result?.data || null;

  const stations = useMemo(() => {
    if (!Array.isArray(data?.stations)) return [];
    return data.stations;
  }, [data]);

  const currentIndex = useMemo(() => {
    return getCurrentIndex(stations, data);
  }, [stations, data]);

  const progress = useMemo(() => {
    return getProgress(currentIndex, stations.length);
  }, [currentIndex, stations.length]);

  const currentStation =
    currentIndex >= 0 ? stations[currentIndex] : stations.find((s: any) => s?.is_current);

  const searchTrain = async () => {
    const cleanTrain = digitsOnly(train);

    if (!cleanTrain || cleanTrain.length < 4) {
      setError("Valid train number enter karein.");
      setResult(null);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const res = await fetch(
        `/api/live-train-status?train=${encodeURIComponent(cleanTrain)}&day=${encodeURIComponent(day)}`,
        { cache: "no-store" }
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok === false || json?.status === "failed") {
        if (res.status === 429) {
          setError("Live train status provider ka monthly quota khatam ho gaya hai. Please try again later.");
        } else {
          setError(json?.message || "Live train status abhi available nahi hai.");
        }
        return;
      }

      setResult(json);
    } catch (err) {
      console.error("Live train status search failed:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const trainTitle = data
    ? `${safe(data.train_number, "")} - ${safe(data.train_name, "Train")}`
    : "";

  const badge = delayBadge(
    currentStation?.delay_status || data?.status || data?.status_message
  );

  const disclaimer =
    "Disclaimer: Live train running status is fetched from a third-party railway data provider and may change due to railway operations. Please verify important travel details with official railway sources.";

  return (
    <main className="customer-app-main">
      <section className="site-container max-w-3xl space-y-5">
        <div className="app-card overflow-hidden p-0">
          <div className="p-4 sm:p-5">
            <p className="text-sm font-black uppercase tracking-wide text-orange-600">
              Indian Railway Live Status
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
              Live Train Running Status
            </h1>

            <p className="mt-2 text-sm font-semibold text-slate-600">
              Enter train number to check current train running status, delay and route details.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px_120px]">
              <input
                value={train}
                onChange={(e) => setTrain(digitsOnly(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") searchTrain();
                }}
                inputMode="numeric"
                placeholder="Enter train number"
                className="app-input"
              />

              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="app-input"
              >
                <option value="0">Today</option>
                <option value="-1">Yesterday</option>
                <option value="1">Tomorrow</option>
              </select>

              <button
                type="button"
                onClick={searchTrain}
                disabled={loading}
                className="app-btn-primary"
              >
                {loading ? "Checking..." : "Search"}
              </button>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            ) : null}
          </div>

          {data ? (
            <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5">
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase text-slate-500">
                      Train
                    </div>
                    <h2 className="mt-1 flex items-center gap-2 text-xl font-black text-slate-950">
                      <span>🚆</span>
                      <span>{trainTitle}</span>
                    </h2>
                    <p className="mt-1 text-sm font-bold text-slate-600">
                      {safe(data?.source || data?.source_stn_name || data?.stations?.[0]?.code)} to{" "}
                      {safe(data?.destination || data?.dest_stn_name || data?.stations?.[stations.length - 1]?.code)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-black text-slate-400">
                      Current Station
                    </div>
                    <div className="mt-1 text-sm font-black text-slate-950">
                      {currentStation
                        ? `${safe(currentStation.code)} - ${titleCase(currentStation.name) || safe(currentStation.name)}`
                        : safe(data?.current_station_name || data?.current_station)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-black text-slate-400">
                      Platform
                    </div>
                    <div className="mt-1 text-sm font-black text-slate-950">
                      {safe(currentStation?.platform || data?.platform_number)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-black text-slate-400">
                      ETA
                    </div>
                    <div className="mt-1 text-sm font-black text-slate-950">
                      {formatTime(currentStation?.arrival_actual || data?.eta)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-black text-slate-400">
                      ETD
                    </div>
                    <div className="mt-1 text-sm font-black text-slate-950">
                      {formatTime(currentStation?.departure_actual || data?.etd)}
                    </div>
                  </div>
                </div>

                {stations.length > 0 ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-black text-slate-500">
                      <span>Route Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              {stations.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <h3 className="text-base font-black text-slate-950">
                      Train Route Status
                    </h3>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {stations.map((station: any, index: number) => {
                      const isCurrent = index === currentIndex;
                      const isPassed = currentIndex >= 0 && index < currentIndex;
                      const stationBadge = delayBadge(station?.delay_status);

                      return (
                        <div
                          key={`${station?.sequence || index}-${station?.code || index}`}
                          className={
                            isCurrent
                              ? "bg-amber-50 px-4 py-3"
                              : "px-4 py-3"
                          }
                        >
                          <div className="grid grid-cols-[52px_1fr_82px] gap-3">
                            <div className="text-right text-xs font-black text-slate-500">
                              <div>{formatTime(station?.arrival_actual || station?.arrival_scheduled)}</div>
                              <div className="mt-2 text-slate-400">
                                {formatTime(station?.departure_actual || station?.departure_scheduled)}
                              </div>
                            </div>

                            <div className="relative pl-5">
                              <span
                                className={
                                  isCurrent
                                    ? "absolute left-0 top-1 h-3 w-3 rounded-full bg-amber-500 ring-4 ring-amber-100"
                                    : isPassed
                                    ? "absolute left-0 top-1 h-3 w-3 rounded-full bg-green-500"
                                    : "absolute left-0 top-1 h-3 w-3 rounded-full bg-slate-300"
                                }
                              />

                              <div className="text-sm font-black text-slate-950">
                                {safe(station?.code)}{" "}
                                <span className="font-bold text-slate-600">
                                  {titleCase(station?.name)}
                                </span>
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                                <span>{safe(station?.distance, "0")} km</span>
                                {station?.platform ? <span>PF {station.platform}</span> : null}
                                {isCurrent ? (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                                    Current Position
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="text-right">
                              <span
                                className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-black ${stationBadge.className}`}
                              >
                                {stationBadge.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-800">
                {disclaimer}
              </div>
            </div>
          ) : null}
        </div>

        <section className="app-card p-5 sm:p-6">
          <h2 className="text-2xl font-black text-slate-950">
            Live Train Running Status | Spot Your Train
          </h2>

          <p className="mt-3 text-sm font-semibold leading-7 text-slate-700">
            RailEats helps passengers check live train running status online by
            train number. You can use this page to know where is my train,
            current station, delay status, expected arrival, expected departure,
            platform number and route updates.
          </p>

          <h3 className="mt-5 text-lg font-black text-slate-950">
            What is live train running status?
          </h3>

          <p className="mt-2 text-sm font-semibold leading-7 text-slate-700">
            Live train running status shows the latest movement information of
            an Indian Railway train. It can help passengers track train delay,
            station arrival, platform details and route progress before ordering
            food in train on RailEats.
          </p>

          <h3 className="mt-5 text-lg font-black text-slate-950">
            How to check NTES train running status on RailEats?
          </h3>

          <ol className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
            <li>1. Enter your train number in the live train status box.</li>
            <li>2. Select Today, Yesterday or Tomorrow as the start day.</li>
            <li>3. Click Search to view current train running information.</li>
            <li>4. Check current station, ETA, ETD, platform and delay status.</li>
          </ol>
        </section>
      </section>
    </main>
  );
}
