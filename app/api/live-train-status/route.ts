"use client";

import { useMemo, useState } from "react";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "").slice(0, 5);
}

function safe(value: any, fallback = "N/A") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function titleCase(value: any) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: any) {
  const text = String(value || "").trim();
  if (!text) return "N/A";

  if (/^\d{2}-\d{2}-\d{4}$/.test(text)) {
    const [dd, mm, yyyy] = text.split("-");
    return `${dd}-${mm}-${yyyy}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [yyyy, mm, dd] = text.split("-");
    return `${dd}-${mm}-${yyyy}`;
  }

  return text;
}

function formatTime(value: any) {
  const text = String(value || "").trim();
  return text || "--";
}

function delayBadge(delayStatus: any) {
  const text = String(delayStatus || "").trim();
  const lower = text.toLowerCase();

  if (!text) {
    return {
      text: "",
      className: "",
    };
  }

  if (lower.includes("delay")) {
    return {
      text,
      className: "bg-red-500 text-white",
    };
  }

  if (lower.includes("on")) {
    return {
      text: "On Time",
      className: "bg-green-100 text-green-700 border border-green-200",
    };
  }

  return {
    text,
    className: "bg-slate-100 text-slate-700 border border-slate-200",
  };
}

function getCurrentIndex(stations: any[], data: any) {
  const direct = stations.findIndex((s) => s?.is_current || s?.is_live_station);
  if (direct >= 0) return direct;

  const currentCode = String(
    data?.current_station_code || data?.current_station || ""
  )
    .trim()
    .toUpperCase();

  if (currentCode) {
    const byCode = stations.findIndex(
      (s) => String(s?.code || "").trim().toUpperCase() === currentCode
    );
    if (byCode >= 0) return byCode;
  }

  return -1;
}

function getProgress(currentIndex: number, total: number) {
  if (currentIndex < 0 || total <= 1) return 0;
  return Math.max(4, Math.min(96, Math.round((currentIndex / (total - 1)) * 100)));
}

export default function LiveTrainStatusClient() {
  const [train, setTrain] = useState("");
  const [day, setDay] = useState("0");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const data = result?.data || null;

  const stations = useMemo(() => {
    if (Array.isArray(data?.stations)) return data.stations;
    return [];
  }, [data]);

  const currentIndex = useMemo(() => getCurrentIndex(stations, data), [stations, data]);
  const progress = getProgress(currentIndex, stations.length);
  const currentStation = currentIndex >= 0 ? stations[currentIndex] : null;

  const searchTrain = async () => {
    const cleanTrain = digitsOnly(train);

    if (cleanTrain.length < 4) {
      setError("Please enter valid train number.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(
        `/api/live-train-status?train=${encodeURIComponent(
          cleanTrain
        )}&day=${encodeURIComponent(day)}`,
        { cache: "no-store" }
      );

      const json = await res.json();

      if (!res.ok || json?.status !== "success") {
        setError(json?.message || json?.error || "Live train status not found.");
        return;
      }

      setResult(json);
    } catch {
      setError("Unable to fetch live train status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="customer-app-main">
      <section className="site-container max-w-3xl">
        <div className="app-card overflow-hidden p-0">
          <div className="p-4 sm:p-5">
            <p className="text-xs font-black uppercase tracking-wide text-orange-600">
              Indian Railway Live Status
            </p>

            <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
              Live Train Running Status
            </h1>

            <p className="mt-2 text-sm font-semibold text-slate-600">
              Enter train number to check current train running status, delay and route details.
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_150px_auto]">
              <input
                value={train}
                onChange={(e) => setTrain(digitsOnly(e.target.value))}
                placeholder="Enter train number"
                inputMode="numeric"
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
                className="app-btn-primary min-w-[96px]"
              >
                {loading ? "..." : "Search"}
              </button>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                {error}
              </div>
            ) : null}
          </div>

          {data ? (
            <div className="border-t border-slate-200">
              <div className="bg-[#1e96e8] px-4 py-3 text-white sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-lg font-black">
                      {safe(data.train_number)} {safe(data.train_name, "Train")}
                    </div>
                    <div className="text-sm font-semibold opacity-95">
                      {safe(data.source)} - {safe(data.destination)}
                    </div>
                  </div>

                  <div className="rounded bg-white/15 px-3 py-1 text-xs font-black">
                    Start Date: {formatDate(data.start_date || data.train_start_date)}
                  </div>
                </div>

                {data.status_message ? (
                  <div className="mt-3 rounded-lg bg-white/15 px-3 py-2 text-sm font-bold">
                    {data.status_message}
                  </div>
                ) : null}

                <div className="mt-3 rounded-lg bg-white/10 p-3">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span>{safe(data.source)}</span>
                    <span>{safe(data.destination)}</span>
                  </div>

                  <div className="relative mt-2 h-3 rounded-full bg-white/30">
                    <div
                      className="absolute left-0 top-0 h-3 rounded-full bg-green-400"
                      style={{ width: `${progress}%` }}
                    />
                    <div
                      className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-4 border-white bg-green-500 shadow"
                      style={{ left: `calc(${progress}% - 10px)` }}
                    />
                  </div>

                  <div className="mt-2 text-center text-xs font-black text-white">
                    {currentStation
                      ? `Current Position: ${titleCase(currentStation.name)} (${safe(
                          currentStation.code
                        )})`
                      : "Current position not available"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[86px_28px_1fr_86px] bg-[#1e96e8] px-3 py-2 text-xs font-black text-white sm:grid-cols-[120px_34px_1fr_120px]">
                <div>Arrival</div>
                <div />
                <div>Station</div>
                <div className="text-right">Departure</div>
              </div>

              <div className="bg-white">
                {stations.length === 0 ? (
                  <div className="p-5 text-center text-sm font-bold text-slate-500">
                    Route stations not available.
                  </div>
                ) : (
                  stations.map((station: any, index: number) => {
                    const isCurrent = index === currentIndex;
                    const badge = delayBadge(station.delay_status);

                    return (
                      <div
                        key={`${station.sequence || index}-${station.code || index}`}
                        className={`grid grid-cols-[86px_28px_1fr_86px] gap-0 border-b border-slate-200 px-3 py-3 text-xs sm:grid-cols-[120px_34px_1fr_120px] ${
                          isCurrent ? "bg-amber-50" : "bg-white"
                        }`}
                      >
                        <div className="text-left">
                          <div className="font-black text-slate-950">
                            {formatTime(station.arrival_scheduled)}
                          </div>
                          <div
                            className={
                              station.arrival_actual &&
                              station.arrival_actual !== station.arrival_scheduled
                                ? "mt-1 font-black text-red-600"
                                : "mt-1 font-bold text-slate-500"
                            }
                          >
                            {formatTime(station.arrival_actual)}
                          </div>
                        </div>

                        <div className="relative flex justify-center">
                          <div className="absolute bottom-[-12px] top-[-12px] w-[3px] bg-slate-300" />
                          <div
                            className={`relative z-10 mt-1 h-4 w-4 rounded-full border-2 border-white shadow ${
                              isCurrent
                                ? "bg-amber-500"
                                : index < currentIndex
                                ? "bg-green-600"
                                : "bg-slate-400"
                            }`}
                          />
                        </div>

                        <div className="min-w-0 pr-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-black uppercase text-slate-950">
                              {titleCase(station.name) || safe(station.code)}
                            </div>

                            <div className="text-xs font-black text-slate-700">
                              {safe(station.code, "")}
                            </div>

                            {station.platform ? (
                              <span className="rounded bg-yellow-400 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                                PF {station.platform}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-1 text-[11px] font-bold text-slate-500">
                            {Number(station.distance || 0)} Kms
                          </div>

                          {isCurrent ? (
                            <div className="mt-2 rounded bg-slate-700 px-3 py-2 text-xs font-black text-white">
                              Departed from {titleCase(station.name)} ({safe(station.code)})
                            </div>
                          ) : null}
                        </div>

                        <div className="text-right">
                          <div className="font-black text-slate-950">
                            {formatTime(station.departure_scheduled)}
                          </div>
                          <div
                            className={
                              station.departure_actual &&
                              station.departure_actual !== station.departure_scheduled
                                ? "mt-1 font-black text-red-600"
                                : "mt-1 font-bold text-slate-500"
                            }
                          >
                            {formatTime(station.departure_actual)}
                          </div>

                          {badge.text ? (
                            <div
                              className={`mt-2 inline-flex rounded px-2 py-1 text-[10px] font-black ${badge.className}`}
                            >
                              {badge.text}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="m-4 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                Disclaimer: Live train status third-party railway data provider se fetch hota hai
                aur kabhi bhi change ho sakta hai. Important travel details official railway
                source se verify karein.
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
