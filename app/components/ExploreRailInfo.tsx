"use client";

import { useState } from "react";

type PnrPassenger = {
  serial?: number;
  quota?: string;
  bookingStatus?: string;
  bookingDetails?: string;
  bookingBerthNo?: number | string;
  currentStatus?: string;
  currentDetails?: string;
  currentBerthNo?: number | string;
  currentCoachId?: string;
  passengerNationality?: string;
  childBerthFlag?: boolean;
};

type PnrResult = {
  ok?: boolean;
  pnr?: string;
  trainNo?: string | null;
  trainName?: string | null;
  dateOfJourney?: string | null;
  boardingPoint?: string | null;
  source?: string | null;
  destination?: string | null;
  chartStatus?: string | null;
  passengersCount?: number;
  passengers?: PnrPassenger[];
  fare?: {
    bookingFare?: number | null;
    ticketFare?: number | null;
  };
  raw?: any;
  error?: string;
  message?: string;
};

const valueOrDash = (value: any) => {
  const text = String(value ?? "").trim();
  return text || "-";
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ExploreRailInfo() {
  const [pnrOpen, setPnrOpen] = useState(false);
  const [pnr, setPnr] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PnrResult | null>(null);
  const [error, setError] = useState("");

  const closePnrModal = () => {
    setPnrOpen(false);
    setPnr("");
    setResult(null);
    setError("");
    setLoading(false);
  };

  const searchPnr = async () => {
    const cleanPnr = pnr.replace(/\D/g, "").slice(0, 10);

    if (cleanPnr.length !== 10) {
      setError("Please enter valid 10 digit PNR.");
      setResult(null);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const res = await fetch(`/api/pnr/${encodeURIComponent(cleanPnr)}`, {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setError(json?.message || json?.error || "PNR details not found.");
        return;
      }

      setResult(json);
    } catch (err) {
      console.error(err);
      setError("Unable to fetch PNR details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const raw = result?.raw || {};
  const journeyClass = raw?.journeyClass || raw?.class || raw?.JourneyClass || "";
  const reservationUpto =
    raw?.reservationUpto ||
    raw?.ReservationUpto ||
    result?.destination ||
    "";
  const bookingDate = raw?.bookingDate || raw?.BookingDate || "";
  const arrivalDate = raw?.arrivalDate || raw?.ArrivalDate || "";
  const distance = raw?.distance || raw?.Distance || "";
  const quota = raw?.quota || raw?.Quota || "";

  return (
    <>
      <section className="mt-10 max-w-4xl mx-auto px-4">
        <h2 className="text-center font-bold mb-4">Explore Railway Information</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <button
            type="button"
            className="p-4 bg-white shadow rounded font-semibold"
          >
            🚆 Track Live Train
          </button>

          <button
            type="button"
            onClick={() => setPnrOpen(true)}
            className="p-4 bg-white shadow rounded font-semibold active:scale-[0.98]"
          >
            📋 Check PNR Status
          </button>

          <button
            type="button"
            className="p-4 bg-white shadow rounded font-semibold"
          >
            📍 Platform Locator
          </button>

          <button
            type="button"
            className="p-4 bg-white shadow rounded font-semibold"
          >
            🕒 Train Time Table
          </button>
        </div>
      </section>

      {pnrOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 px-4 flex items-center justify-center">
          <div className="w-full max-w-md max-h-[86vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-lg">
                  Check PNR Status
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter 10 digit PNR to view journey details.
                </p>
              </div>

              <button
                type="button"
                onClick={closePnrModal}
                className="w-9 h-9 rounded-full border border-slate-200 text-xl leading-none"
                aria-label="Close PNR status"
              >
                ×
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <input
                  value={pnr}
                  onChange={(e) =>
                    setPnr(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="Enter 10 digit PNR"
                  inputMode="numeric"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-orange-500"
                />

                <button
                  type="button"
                  onClick={searchPnr}
                  disabled={loading}
                  className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  {loading ? "..." : "Search"}
                </button>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-slate-500">
                          PNR
                        </div>
                        <div className="text-lg font-black text-slate-900">
                          {valueOrDash(result.pnr)}
                        </div>
                      </div>

                      <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                        {valueOrDash(result.chartStatus)}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                      <div className="font-black text-slate-900">
                        🚆 {valueOrDash(result.trainNo)} -{" "}
                        {valueOrDash(result.trainName)}
                      </div>

                      <div className="text-slate-600">
                        📅 Journey: {formatDateTime(result.dateOfJourney)}
                      </div>

                      <div className="text-slate-600">
                        🎟 Class: {valueOrDash(journeyClass)} | Quota:{" "}
                        {valueOrDash(quota)}
                      </div>

                      <div className="text-slate-600">
                        📍 Source: {valueOrDash(result.source)} | Boarding:{" "}
                        {valueOrDash(result.boardingPoint)}
                      </div>

                      <div className="text-slate-600">
                        🏁 Destination: {valueOrDash(result.destination)} |
                        Deboard: {valueOrDash(reservationUpto)}
                      </div>

                      {arrivalDate ? (
                        <div className="text-slate-600">
                          ⏰ Arrival: {formatDateTime(arrivalDate)}
                        </div>
                      ) : null}

                      {bookingDate ? (
                        <div className="text-slate-600">
                          🧾 Booking Date: {formatDateTime(bookingDate)}
                        </div>
                      ) : null}

                      <div className="text-slate-600">
                        💰 Fare: Rs {valueOrDash(result.fare?.ticketFare)}{" "}
                        {distance ? `| Distance: ${distance} km` : ""}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-black text-slate-900">
                      Passenger Details ({result.passengersCount || 0})
                    </h4>

                    <div className="space-y-2">
                      {(result.passengers || []).map((p, index) => (
                        <div
                          key={`${p.serial || index}-${index}`}
                          className="rounded-2xl border border-slate-200 bg-white p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-black text-slate-900">
                              Passenger {p.serial || index + 1}
                            </div>

                            <div className="rounded-full bg-green-50 px-2 py-1 text-xs font-black text-green-700">
                              {valueOrDash(p.currentStatus)}
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-slate-600">
                            <div>
                              Current Seat/Coach:{" "}
                              <strong className="text-slate-900">
                                {valueOrDash(p.currentDetails)}
                              </strong>
                            </div>

                            <div>
                              Coach:{" "}
                              <strong className="text-slate-900">
                                {valueOrDash(p.currentCoachId)}
                              </strong>{" "}
                              | Seat:{" "}
                              <strong className="text-slate-900">
                                {valueOrDash(p.currentBerthNo)}
                              </strong>
                            </div>

                            <div>
                              Booking Status:{" "}
                              <strong className="text-slate-900">
                                {valueOrDash(p.bookingDetails)}
                              </strong>
                            </div>

                            <div>
                              Quota: {valueOrDash(p.quota)} | Nationality:{" "}
                              {valueOrDash(p.passengerNationality)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
