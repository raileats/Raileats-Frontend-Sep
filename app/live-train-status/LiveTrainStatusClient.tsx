"use client";

import { useState } from "react";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "").slice(0, 5);
}

function safe(value: any, fallback = "N/A") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formatDateTime(value?: string | null) {
  if (!value) return "N/A";

  const normalized = String(value).replace(" ", "T");
  const d = new Date(normalized);

  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function delayText(delay: any) {
  const mins = Number(delay || 0);

  if (!Number.isFinite(mins) || mins <= 0) {
    return "On time";
  }

  if (mins < 60) {
    return `${mins} min late`;
  }

  const h = Math.floor(mins / 60);
  const m = mins % 60;

  return `${h}h ${m}m late`;
}

function delayClass(delay: any) {
  const mins = Number(delay || 0);

  if (!Number.isFinite(mins) || mins <= 0) {
    return "bg-green-50 text-green-700 border-green-100";
  }

  return "bg-red-50 text-red-700 border-red-100";
}

export default function LiveTrainStatusClient() {
  const [train, setTrain] = useState("");
  const [day, setDay] = useState("0");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const data = result?.data || null;

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
        `/api/live-train-status?train=${encodeURIComponent(cleanTrain)}&day=${encodeURIComponent(day)}`,
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
      <section className="site-container max-w-2xl">
        <div className="app-card p-5 sm:p-6">
          <p className="text-sm font-black uppercase tracking-wide text-orange-600">
            Indian Railway Live Status
          </p>

          <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
            Live Train Running Status
          </h1>

          <p className="mt-2 text-sm font-semibold text-slate-600">
            Enter train number to check current train running status, delay,
            platform and route details.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_150px_auto]">
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

          {data ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-sky-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase text-slate-500">
                      Train
                    </div>

                    <div className="mt-1 text-xl font-black text-slate-950">
                      🚆 {safe(data.train_number)} - {safe(data.train_name, "Train")}
                    </div>

                    <div className="mt-2 text-sm font-bold text-slate-600">
                      {safe(data.source)} to {safe(data.destination)}
                    </div>
                  </div>

                  <div
                    className={`rounded-full border px-3 py-1 text-xs font-black ${delayClass(
                      data.delay
                    )}`}
                  >
                    {delayText(data.delay)}
                  </div>
                </div>

                {data.status_message ? (
                  <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                    {data.status_message}
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border bg-white p-3">
                    <div className="text-xs font-black text-slate-400">
                      Current Station
                    </div>
                    <div className="mt-1 font-black text-slate-950">
                      {safe(data.current_station_name || data.current_station_code)}
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-white p-3">
                    <div className="text-xs font-black text-slate-400">
                      Platform
                    </div>
                    <div className="mt-1 font-black text-slate-950">
                      {safe(data.platform_number)}
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-white p-3">
                    <div className="text-xs font-black text-slate-400">
                      ETA
                    </div>
                    <div className="mt-1 font-black text-slate-950">
                      {safe(data.eta)}
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-white p-3">
                    <div className="text-xs font-black text-slate-400">
                      ETD
                    </div>
                    <div className="mt-1 font-black text-slate-950">
                      {safe(data.etd)}
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-white p-3">
                    <div className="text-xs font-black text-slate-400">
                      Start Date
                    </div>
                    <div className="mt-1 font-black text-slate-950">
                      {safe(data.train_start_date || data.start_date)}
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-white p-3">
                    <div className="text-xs font-black text-slate-400">
                      STD
                    </div>
                    <div className="mt-1 font-black text-slate-950">
                      {formatDateTime(data.std)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <h2 className="text-lg font-black text-slate-950">
                  Route Summary
                </h2>

                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs font-black text-slate-400">
                      Source
                    </div>
                    <div className="mt-1 font-black text-slate-950">
                      {safe(data.source_stn_name)} ({safe(data.source)})
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs font-black text-slate-400">
                      Destination
                    </div>
                    <div className="mt-1 font-black text-slate-950">
                      {safe(data.dest_stn_name)} ({safe(data.destination)})
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs font-black text-slate-400">
                      Run Days
                    </div>
                    <div className="mt-1 font-black text-slate-950">
                      {safe(data.run_days)}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs font-black text-slate-400">
                      Journey Time
                    </div>
                    <div className="mt-1 font-black text-slate-950">
                      {safe(data.journey_time)} min
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                Disclaimer: Live train status third-party railway data provider
                se fetch hota hai aur kabhi bhi change ho sakta hai. Important
                travel details official railway source se verify karein.
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
