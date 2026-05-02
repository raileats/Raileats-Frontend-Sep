"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useBooking } from "../../../lib/useBooking";

const SUPABASE_URL = "https://ygisiztmuzwxpnvhwrmr.supabase.co";

/* ================= SLUG FIX ================= */
function toSlug(str: string) {
  return (str || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "");
}

/* ================= LIVE CLOCK ================= */
function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/* ================= PARSE HELPERS ================= */

function parseDateParts(date: string) {
  if (!date) return null;

  if (date.includes(" ")) {
    const [day, mon, year] = date.split(" ");
    const months: any = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    return { y: Number(year), m: months[mon] ?? 0, d: Number(day) };
  }

  const [y, m, d] = date.split("-").map(Number);
  return { y, m: (m || 1) - 1, d };
}

function parseTimeParts(t: string) {
  if (!t) return { h: 0, m: 0, s: 0 };
  const p = t.split(":").map(Number);
  return {
    h: p[0] ?? 0,
    m: p[1] ?? 0,
    s: p[2] ?? 0,
  };
}

/* ================= FINAL LOGIC ================= */
function getRemaining(arrival: string, date: string, cutoffMin: number) {
  try {
    const dp = parseDateParts(date);
    const tp = parseTimeParts(arrival);
    if (!dp) return 0;

    const arrivalDT = new Date(dp.y, dp.m, dp.d, tp.h, tp.m, tp.s);
    const deadlineDT = new Date(arrivalDT.getTime() - cutoffMin * 60000);

    const now = new Date();
    return deadlineDT.getTime() - now.getTime();
  } catch {
    return 0;
  }
}

export default function TrainPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const { setTrain, setJourney } = useBooking();

  const slug = (params as any)?.slug || "";
  const trainNumber = slug.match(/^(\d+)/)?.[1] || "";

  const urlDate = searchParams.get("date") || "";
  const boarding = (searchParams.get("boarding") || "").toUpperCase();

  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useNow();

  /* 🔥 STORE BOOKING */
  useEffect(() => {
    if (!trainNumber) return;

    setTrain({
      number: trainNumber,
      name: "",
    });

    setJourney(urlDate, boarding);
  }, [trainNumber, urlDate, boarding]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/train-restros?train=${trainNumber}&date=${urlDate}&boarding=${boarding}&full=1`,
          { cache: "no-store" }
        );
        const json = await res.json();
        setStations(json?.stations || []);
      } catch (e) {
        console.error("API ERROR:", e);
      } finally {
        setLoading(false);
      }
    }

    if (trainNumber) fetchData();
  }, [trainNumber, urlDate, boarding]);

  if (loading) {
    return (
      <div className="p-10 text-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <div className="font-semibold">Loading restaurants...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {stations.map((st: any, index: number) => {
        const stationCode = st.StationCode;
        const stationName = st.StationName;
        const arrives = st.Arrives;
        const halt = st.HaltTime;
        const deliveryDate = st.date || urlDate;

        const vendors = st.vendors || [];

        const validVendors = vendors.filter((r: any) => {
          const cutoff = parseInt(
            String(r.CutOffTime ?? r.cutoff_time ?? "0").trim(),
            10
          ) || 0;

          const remaining = getRemaining(arrives, deliveryDate, cutoff);
          return remaining > 0;
        });

        if (!validVendors.length) return null;

        return (
          <div key={index} className="border rounded-xl p-4 bg-gray-50">
            <div className="flex justify-between mb-3">
              <div>
                <h2 className="font-bold text-lg">
                  {stationName} ({stationCode})
                </h2>
                <div className="text-xs text-gray-500">{deliveryDate}</div>
              </div>

              <div className="text-right">
                <div className="text-blue-600 font-semibold">
                  Arrival: {arrives}
                </div>
                <div className="text-xs text-gray-500">
                  Halt: {halt}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {validVendors.map((r: any) => {
                const cutoff = parseInt(
                  String(r.CutOffTime ?? r.cutoff_time ?? "0").trim(),
                  10
                ) || 0;

                const remaining = getRemaining(arrives, deliveryDate, cutoff);

                const totalSec = Math.max(0, Math.floor(remaining / 1000));

                const days = Math.floor(totalSec / 86400);
                const hrs = Math.floor((totalSec % 86400) / 3600);
                const mins = Math.floor((totalSec % 3600) / 60);
                const secs = totalSec % 60;

                const timeText =
                  `Day${days} ` +
                  `${String(hrs).padStart(2, "0")}:` +
                  `${String(mins).padStart(2, "0")}:` +
                  `${String(secs).padStart(2, "0")}`;

                const isClosingSoon = remaining <= 10 * 60 * 1000;

                let img = "";
                if (r.RestroDisplayPhoto) {
                  const file = r.RestroDisplayPhoto.split("/").pop();
                  img = `${SUPABASE_URL}/storage/v1/object/public/RestroDisplayPhoto/${file}`;
                }

                const cleanArrival = (arrives || "").slice(0, 5);

                return (
                  <div key={r.RestroCode} className="bg-white p-3 rounded-lg border flex gap-3">
                    <div className="w-24 h-24 bg-gray-100 rounded-md overflow-hidden">
                      {img ? (
                        <img src={img} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="font-semibold">{r.RestroName}</div>

                        <div className="text-xs text-gray-500">
                          Min. Order: ₹{r.MinimumOrderValue}
                        </div>

                        <div className="text-green-600 text-xs font-semibold">
                          ● Pure Veg
                        </div>

                        <div className={`text-xs font-bold mt-1 ${isClosingSoon ? "text-red-600" : "text-blue-600"}`}>
                          ⏳ Order before: {timeText}
                          {isClosingSoon && " ⚠ Closing soon"}
                        </div>
                      </div>

                      <div className="text-right">
                        <a
                          href={`/menu?restro=${r.RestroCode}&station=${stationCode}&date=${deliveryDate}&train=${trainNumber}&boarding=${boarding}&arrival=${cleanArrival}`}
                          onClick={() => {
                            localStorage.setItem(
                              "selectedBooking",
                              JSON.stringify({
                                restro_name: r.RestroName,
                                restro_code: r.RestroCode,
                                station_name: stationName,
                                station_code: stationCode,
                                date: deliveryDate,
                                train_number: trainNumber,
                                arrival: cleanArrival,
                              })
                            );
                          }}
                          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm"
                        >
                          Order Now
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
