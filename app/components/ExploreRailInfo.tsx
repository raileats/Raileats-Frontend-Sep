"use client";

import { useState } from "react";

export default function ExploreRailInfo() {
  const [open, setOpen] = useState(false);
  const [pnr, setPnr] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const searchPnr = async () => {
    const clean = pnr.replace(/\D/g, "").slice(0, 10);

    if (clean.length !== 10) {
      setError("Please enter valid 10 digit PNR");
      setResult(null);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const res = await fetch(`/api/pnr/${clean}`, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setError(json?.message || "PNR details not found");
        return;
      }

      setResult(json);
    } catch {
      setError("Unable to check PNR right now");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (value?: string | null) => {
    if (!value) return "N/A";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;

    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <section className="mt-10 max-w-4xl mx-auto px-4">
      <h2 className="text-center font-bold mb-4">Explore Railway Information</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="p-4 bg-white shadow rounded">🚆 Track Live Train</div>

        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setError("");
            setResult(null);
          }}
          className="p-4 bg-white shadow rounded text-center"
        >
          📋 Check PNR Status
        </button>

        <div className="p-4 bg-white shadow rounded">📍 Platform Locator</div>
        <div className="p-4 bg-white shadow rounded">🕒 Train Time Table</div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[9999] bg-black/55 flex items-center justify-center px-3">
          <div className="w-full max-w-md max-h-[88vh] overflow-y-auto overflow-x-hidden bg-white rounded-3xl shadow-2xl">
            <div className="sticky top-0 z-10 bg-white border-b px-5 py-4 rounded-t-3xl flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Check PNR Status
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Enter 10 digit PNR to view journey details.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-10 h-10 shrink-0 rounded-full border text-xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-2">
                <input
                  value={pnr}
                  onChange={(e) =>
                    setPnr(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="Enter PNR"
                  className="min-w-0 border rounded-2xl px-4 py-3 font-bold text-lg outline-none focus:border-orange-500"
                />

                <button
                  type="button"
                  onClick={searchPnr}
                  disabled={loading}
                  className="rounded-2xl bg-orange-500 text-white text-sm font-black disabled:opacity-60"
                >
                  {loading ? "..." : "Search"}
                </button>
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-bold text-red-600">
                  {error}
                </div>
              )}

              {result && (
                <>
                  <div className="rounded-3xl border bg-gradient-to-br from-orange-50 via-white to-blue-50 p-4 space-y-3">
                    <div className="flex justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-slate-500">
                          PNR
                        </div>
                        <div className="text-2xl font-black text-slate-950">
                          {result.pnr}
                        </div>
                      </div>

                      <span className="h-fit rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-black">
                        {result.chartStatus || "Status N/A"}
                      </span>
                    </div>

                    <div className="text-base font-black text-slate-900">
                      🚆 {result.trainNo || "N/A"}{" "}
                      {result.trainName ? `- ${result.trainName}` : ""}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <Info label="Journey" value={fmt(result.dateOfJourney)} />
                      <Info label="Arrival" value={fmt(result.raw?.arrivalDate)} />
                      <Info label="Class" value={result.raw?.journeyClass || "N/A"} />
                      <Info label="Chart" value={result.chartStatus || "N/A"} />
                      <Info label="Boarding" value={result.boardingPoint || "N/A"} />
                      <Info label="Destination" value={result.destination || "N/A"} />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-black text-slate-900 mb-3">
                      Passenger Details ({result.passengersCount || 0})
                    </h4>

                    <div className="space-y-3">
                      {(result.passengers || []).map((p: any, index: number) => {
                        const status = String(
                          p.currentStatus || p.bookingStatus || ""
                        ).toUpperCase();

                        const statusStyle = getStatusStyle(status);
                        const currentDetails =
                          p.currentDetails ||
                          p.bookingDetails ||
                          "N/A";

                        return (
                          <div
                            key={index}
                            className="rounded-3xl border bg-white p-4 shadow-sm"
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div>
                                <div className="text-base font-black text-slate-900">
                                  Passenger {p.serial || index + 1}
                                </div>
                                <div className="text-xs font-bold text-slate-400 mt-1">
                                  Current seat / coach
                                </div>
                              </div>

                              <span
                                className={`rounded-full px-3 py-1 text-sm font-black ${statusStyle}`}
                              >
                                {status || "N/A"}
                              </span>
                            </div>

                            <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                              <div
                                className={`text-xl font-black leading-tight ${getStatusTextColor(
                                  status
                                )}`}
                              >
                                {currentDetails}
                              </div>

                              <div className="mt-2 text-sm font-bold text-slate-500">
                                Coach:{" "}
                                <span className="text-slate-900">
                                  {p.currentCoachId || "N/A"}
                                </span>
                                {"  "}•{"  "}
                                Seat:{" "}
                                <span className="text-slate-900">
                                  {p.currentBerthNo || "N/A"}
                                </span>
                              </div>
                            </div>

                            {p.bookingDetails &&
                              p.bookingDetails !== currentDetails && (
                                <div className="mt-3 text-sm font-bold text-slate-500">
                                  Booking:{" "}
                                  <span className="text-slate-900">
                                    {p.bookingDetails}
                                  </span>
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function getStatusStyle(status: string) {
  if (status.includes("WL")) {
    return "bg-red-100 text-red-700";
  }

  if (status.includes("RAC")) {
    return "bg-blue-100 text-blue-700";
  }

  if (status.includes("CNF") || status.includes("CONFIRM")) {
    return "bg-green-100 text-green-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getStatusTextColor(status: string) {
  if (status.includes("WL")) return "text-red-700";
  if (status.includes("RAC")) return "text-blue-700";
  if (status.includes("CNF") || status.includes("CONFIRM")) return "text-green-700";
  return "text-slate-900";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/80 border px-3 py-2">
      <div className="text-[11px] font-black text-slate-400">{label}</div>
      <div className="text-sm font-black text-slate-800 leading-tight">
        {value}
      </div>
    </div>
  );
}
