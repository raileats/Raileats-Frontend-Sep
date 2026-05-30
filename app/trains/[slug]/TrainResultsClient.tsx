"use client";

import React, { useEffect, useState } from "react";
import { useBooking } from "../../../lib/useBooking";

const SUPABASE_URL = "https://ygisiztmuzwxpnvhwrmr.supabase.co";

type Props = {
  slug: string;
  trainNumber: string;
  trainName: string;
  urlDate: string;
  boarding: string;
};

function toSlug(str: string) {
  return String(str || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "");
}

function useNow() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return now;
}

function parseDateParts(date: string) {
  if (!date) return null;

  if (date.includes(" ")) {
    const [day, mon, year] = date.split(" ");
    const months: Record<string, number> = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };

    return { y: Number(year), m: months[mon] ?? 0, d: Number(day) };
  }

  const [y, m, d] = date.split("-").map(Number);
  return { y, m: (m || 1) - 1, d };
}

function parseTimeParts(t: string) {
  const p = String(t || "").split(":").map(Number);

  return {
    h: p[0] ?? 0,
    m: p[1] ?? 0,
    s: p[2] ?? 0,
  };
}

function getRemaining(
  arrival: string,
  date: string,
  cutoffMin: number,
  nowMs: number
) {
  try {
    const dp = parseDateParts(date);
    const tp = parseTimeParts(arrival);

    if (!dp) return 0;

    const arrivalDT = new Date(dp.y, dp.m, dp.d, tp.h, tp.m, tp.s);
    const deadlineDT = new Date(arrivalDT.getTime() - cutoffMin * 60000);

    return deadlineDT.getTime() - nowMs;
  } catch {
    return 0;
  }
}

function toMin(t: string) {
  const [h, m] = String(t || "").slice(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isRestaurantOpenForArrival(restro: any, arrival: string) {
  const cleanArrival = String(arrival || "").slice(0, 5);
  const arrivalMin = toMin(cleanArrival);

  const start = restro.OpenTime || restro.open_time;
  const end = restro.ClosedTime || restro.closed_time;

  if (!start || !end) return true;

  const startMin = toMin(start);
  const endMin = toMin(end);

  if (endMin >= startMin) {
    return arrivalMin >= startMin && arrivalMin <= endMin;
  }

  return arrivalMin >= startMin || arrivalMin <= endMin;
}

function formatCountdown(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hrs = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (days > 0) {
    return `${days}d ${String(hrs).padStart(2, "0")}:${String(mins).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(
    2,
    "0"
  )}:${String(secs).padStart(2, "0")}`;
}

function isPureVeg(value: any) {
  const normalized = String(value ?? "").toLowerCase().trim();

  return (
    value === true ||
    value === 1 ||
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

function getRestroImage(restro: any) {
  const raw = String(restro.RestroDisplayPhoto || "").trim();

  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  const file = raw.split("/").pop();
  if (!file) return "";

  return `${SUPABASE_URL}/storage/v1/object/public/RestroDisplayPhoto/${encodeURIComponent(
    file
  )}`;
}

function buildRestroHref({
  stationCode,
  stationName,
  restro,
  deliveryDate,
  arrival,
  trainNumber,
  trainName,
  boarding,
}: {
  stationCode: string;
  stationName: string;
  restro: any;
  deliveryDate: string;
  arrival: string;
  trainNumber: string;
  trainName: string;
  boarding: string;
}) {
  const stationSlug = `${stationCode}-${toSlug(stationName)}`;
  const restroSlug = `${restro.RestroCode}-${toSlug(restro.RestroName)}`;
  const cleanArrival = arrival && arrival.includes(":") ? arrival.slice(0, 5) : "";

  const query = new URLSearchParams({
    deliveryDate,
    train: trainNumber,
    trainName: trainName || "Train",
    boarding,
    minOrder: String(restro.MinimumOrderValue || 0),
  });

  if (cleanArrival) {
    query.set("deliveryTime", cleanArrival);
    query.set("arrival", cleanArrival);
  }

  return `/Stations/${stationSlug}/${restroSlug}?${query.toString()}`;
}

export default function TrainResultsClient({
  trainNumber,
  trainName,
  urlDate,
  boarding,
}: Props) {
  const { setTrain, setJourney } = useBooking();
  const now = useNow();

  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trainNumber) return;

    setTrain({
      number: trainNumber,
      name: trainName,
    });

    setJourney(urlDate, boarding);
  }, [trainNumber, trainName, urlDate, boarding, setTrain, setJourney]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const res = await fetch(
          `/api/train-restros?train=${encodeURIComponent(
            trainNumber
          )}&date=${encodeURIComponent(urlDate)}&boarding=${encodeURIComponent(
            boarding
          )}&full=1`,
          { cache: "no-store" }
        );

        const json = await res.json();
        setStations(Array.isArray(json?.stations) ? json.stations : []);
      } catch (e) {
        console.error("train-restros API error:", e);
        setStations([]);
      } finally {
        setLoading(false);
      }
    }

    if (trainNumber) fetchData();
  }, [trainNumber, urlDate, boarding]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="w-9 h-9 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="font-semibold text-slate-800">
          Finding available restaurants...
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Checking route, station timing and restaurant availability.
        </p>
      </div>
    );
  }

  const visibleStations = stations
    .map((st: any) => {
      const vendors = Array.isArray(st.vendors) ? st.vendors : [];
      const deliveryDate = st.date || urlDate;
      const arrives = st.Arrives || st.arrives || "";

      const validVendors = vendors.filter((restro: any) => {
        const cutoff =
          parseInt(String(restro.CutOffTime ?? restro.cutoff_time ?? "0"), 10) ||
          0;

        const remaining = getRemaining(arrives, deliveryDate, cutoff, now);
        const timeValid = isRestaurantOpenForArrival(restro, arrives);

        return remaining > 0 && timeValid;
      });

      return { ...st, deliveryDate, arrives, validVendors };
    })
    .filter((st: any) => st.validVendors.length > 0);

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-4 space-y-5">
      <section className="app-card p-4 bg-gradient-to-br from-amber-50 to-white border-amber-200">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Train food delivery
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
          Food in Train {trainNumber}
          {trainName ? ` - ${trainName}` : ""}
        </h1>

        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-white border border-amber-100 p-3">
            <span className="block text-slate-500">Boarding</span>
            <strong>{boarding || "Not selected"}</strong>
          </div>
          <div className="rounded-lg bg-white border border-amber-100 p-3">
            <span className="block text-slate-500">Journey Date</span>
            <strong>{urlDate || "Not selected"}</strong>
          </div>
        </div>
      </section>

      {visibleStations.length === 0 ? (
        <section className="app-card p-5 text-center">
          <h2 className="font-bold text-lg">No restaurants available right now</h2>
          <p className="text-sm text-slate-500 mt-2">
            Availability depends on train arrival time, restaurant service hours,
            weekly off, holiday status and order cutoff time.
          </p>
          <a href="/" className="app-btn-primary inline-flex mt-4">
            Search another train
          </a>
        </section>
      ) : (
        visibleStations.map((st: any, index: number) => {
          const stationCode = st.StationCode || st.stationCode || "";
          const stationName = st.StationName || st.stationName || "";
          const state = st.State || "";
          const halt = st.HaltTime || st.halt || "-";
          const deliveryDate = st.deliveryDate;
          const arrives = st.arrives;

          return (
            <section key={`${stationCode}-${index}`} className="app-card overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">
                      {stationName} ({stationCode})
                    </h2>
                    {state && (
                      <p className="text-sm text-slate-600 font-semibold mt-1">
                        {state}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Delivery date: {deliveryDate}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-blue-600 font-extrabold">
                      {arrives ? `Arrival ${arrives.slice(0, 5)}` : "Arrival N/A"}
                    </div>
                    <div className="text-xs text-slate-500">Halt: {halt}</div>
                  </div>
                </div>
              </div>

              <div className="p-3 space-y-3">
                {st.validVendors.map((restro: any) => {
                  const cutoff =
                    parseInt(
                      String(restro.CutOffTime ?? restro.cutoff_time ?? "0"),
                      10
                    ) || 0;

                  const remaining = getRemaining(
                    arrives,
                    deliveryDate,
                    cutoff,
                    now
                  );

                  const isClosingSoon = remaining <= 10 * 60 * 1000;
                  const img = getRestroImage(restro);
                  const pureVeg = isPureVeg(restro.IsPureVeg);
                  const href = buildRestroHref({
                    stationCode,
                    stationName,
                    restro,
                    deliveryDate,
                    arrival: arrives,
                    trainNumber,
                    trainName,
                    boarding,
                  });

                  return (
                    <article
                      key={restro.RestroCode}
                      className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex gap-3">
                        <div className="w-24 h-24 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                          {img ? (
                            <img
                              src={img}
                              alt={`${restro.RestroName} food delivery in train`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  "/raileats-logo.png";
                              }}
                            />
                          ) : (
                            <img
                              src="/raileats-logo.png"
                              alt="RailEats"
                              className="w-full h-full object-contain p-4"
                              loading="lazy"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-extrabold text-slate-900 leading-tight">
                            {restro.RestroName}
                          </h3>

                          <p className="text-sm text-slate-500 mt-1">
                            Min. Order: ₹{restro.MinimumOrderValue || 0}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                            {pureVeg ? (
                              <span className="text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-1">
                                Pure Veg
                              </span>
                            ) : (
                              <span className="text-slate-600 bg-slate-50 border border-slate-100 rounded-full px-2 py-1">
                                Veg & Non-Veg
                              </span>
                            )}

                            <span
                              className={`rounded-full px-2 py-1 border ${
                                isClosingSoon
                                  ? "text-red-700 bg-red-50 border-red-100"
                                  : "text-blue-700 bg-blue-50 border-blue-100"
                              }`}
                            >
                              Order before {formatCountdown(remaining)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                          Fresh food delivery at {stationName}.
                        </p>
                        <a
                          href={href}
                          className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
                        >
                          Order Now
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      <section className="app-card p-4">
        <h2 className="app-section-title">
          How RailEats shows restaurants for train {trainNumber}
        </h2>
        <p className="app-muted mt-2">
          RailEats checks the train route, station arrival time, restaurant
          opening hours, closing hours, cutoff time, weekly off, holiday status
          and outlet availability before showing restaurants for online train
          food delivery.
        </p>
      </section>
    </main>
  );
}
