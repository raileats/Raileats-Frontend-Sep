"use client";

import { useState } from "react";

export default function PnrStatusClient() {
  const [pnr, setPnr] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function checkPnr() {
    const clean = pnr.trim();

    if (!/^\d{10}$/.test(clean)) {
      setError("Please enter valid 10 digit PNR number.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/pnr/${clean}`, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setError(json?.message || "PNR status not found. Please try again.");
        return;
      }

      setResult(json);
    } catch {
      setError("Unable to check PNR right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="customer-app-main">
      <section className="site-container">
        <div className="app-card p-5 sm:p-6">
          <p className="text-sm font-black uppercase tracking-wide text-orange-600">
            Indian Railway PNR Status
          </p>

          <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
            Check PNR Status Online
          </h1>

          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
            Enter your 10 digit PNR number to check train name, journey date,
            chart status, coach and seat details. You can also order fresh food
            in train with RailEats after checking your journey details.
          </p>

          <div className="mt-5 flex gap-2">
            <input
              value={pnr}
              onChange={(e) => setPnr(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="Enter 10 digit PNR"
              className="app-input flex-1"
              inputMode="numeric"
            />
            <button
              type="button"
              onClick={checkPnr}
              disabled={loading}
              className="app-btn-primary shrink-0"
            >
              {loading ? "Checking..." : "Check"}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase text-slate-500">
                    PNR
                  </div>
                  <div className="text-2xl font-black text-slate-950">
                    {result.pnr}
                  </div>
                </div>

                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                  {result.chartStatus || "Status Available"}
                </span>
              </div>

              <div className="mt-4 text-lg font-black text-slate-950">
                🚆 {result.trainNo} - {result.trainName}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Info label="Journey" value={result.dateOfJourney || "-"} />
                <Info label="Boarding" value={result.boardingPoint || "-"} />
                <Info label="From" value={result.source || "-"} />
                <Info label="To" value={result.destination || "-"} />
              </div>

              {Array.isArray(result.passengers) && result.passengers.length > 0 && (
                <div className="mt-5 space-y-3">
                  <h2 className="text-lg font-black text-slate-950">
                    Passenger Details
                  </h2>

                  {result.passengers.map((p: any, index: number) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-black text-slate-950">
                          Passenger {index + 1}
                        </div>
                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-black text-green-700">
                          {p.currentStatus || "-"}
                        </span>
                      </div>

                      <div className="mt-3 text-sm font-bold text-slate-700">
                        Current:{" "}
                        <span className="font-black text-slate-950">
                          {p.currentDetails || "-"}
                        </span>
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        Booking: {p.bookingDetails || "-"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <section className="mt-5 app-card p-5">
          <h2 className="text-xl font-black text-slate-950">
            What is PNR status?
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            PNR status shows your railway ticket booking details, current seat
            confirmation, coach, berth and chart preparation status. RailEats
            helps passengers check PNR details and order food for their train
            journey.
          </p>
        </section>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-xs font-black uppercase text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm font-black text-slate-900">
        {value}
      </div>
    </div>
  );
}
