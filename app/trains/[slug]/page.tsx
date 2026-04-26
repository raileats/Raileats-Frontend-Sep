"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

const SUPABASE_URL = "https://ygisiztmuzwxpnvhwrmr.supabase.co";

/* ================= LIVE CLOCK ================= */
function useNow() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return now;
}

/* ================= DATE FIX ================= */
function normalizeDate(date: string) {
  if (!date) return "";

  if (date.includes(" ")) {
    const [day, mon, year] = date.split(" ");

    const months: any = {
      Jan: "01", Feb: "02", Mar: "03", Apr: "04",
      May: "05", Jun: "06", Jul: "07", Aug: "08",
      Sep: "09", Oct: "10", Nov: "11", Dec: "12",
    };

    return `${year}-${months[mon]}-${day.padStart(2, "0")}`;
  }

  return date;
}

/* ================= TIME FIX ================= */
function normalizeTime(t: string) {
  if (!t) return "00:00:00";

  const parts = t.split(":").map(Number);

  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const s = parts[2] ?? 0;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ================= FINAL CALC ================= */

function getRemaining(arrival: string, date: string, cutoffMin: number) {
  try {
    const d = normalizeDate(date);
    const t = normalizeTime(arrival);

    const [year, month, day] = d.split("-").map(Number);
    const [hh, mm] = t.split(":").map(Number);

    const arrivalDateTime = new Date(year, month - 1, day, hh, mm, 0);
    const nowDateTime = new Date();

    // 🔥 STEP 1: diff in minutes
    const diffMin = Math.floor(
      (arrivalDateTime.getTime() - nowDateTime.getTime()) / 60000
    );

    // 🔥 STEP 2: FINAL
    const remainingMin = diffMin - cutoffMin;

    // 🔥 DEBUG (important)
    console.log({
      arrival,
      diffMin,
      cutoffMin,
      remainingMin
    });

    // 🔥 STEP 3: convert back to ms
    return remainingMin * 60000;

  } catch (e) {
    console.log("TIME ERROR", e);
    return 0;
  }
}

export default function TrainPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = (params as any)?.slug || "";
  const trainNumber = slug.match(/^(\d+)/)?.[1] || "";

  const urlDate = searchParams.get("date") || "";
  const boarding = (searchParams.get("boarding") || "").toUpperCase();

  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const now = useNow();

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

        /* ================= FILTER ================= */
        const validVendors = vendors.filter((r: any) => {
          const cutoff = Number(r.CutOffTime || r.cutoff_time || 0);
          const remaining = getRemaining(arrives, deliveryDate, cutoff, now);
          return remaining > 0;
        });

        if (!validVendors.length) return null;

        return (
          <div key={index} className="border rounded-xl p-4 bg-gray-50">

            {/* HEADER */}
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

            {/* VENDORS */}
            <div className="space-y-3">
              {validVendors.map((r: any) => {
                const cutoff = Number(r.CutOffTime || r.cutoff_time || 0);
                const remaining = getRemaining(arrives, deliveryDate, cutoff, now);

                const totalSec = Math.floor(remaining / 1000);

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

                return (
                  <div key={r.RestroCode} className="bg-white p-3 rounded-lg border flex gap-3">

                    {/* IMAGE */}
                    <div className="w-24 h-24 bg-gray-100 rounded-md overflow-hidden">
                      {img ? (
                        <img src={img} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* INFO */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="font-semibold">{r.RestroName}</div>

                        <div className="text-xs text-gray-500">
                          Min. Order: ₹{r.MinimumOrderValue}
                        </div>

                        <div className="text-green-600 text-xs font-semibold">
                          ● Pure Veg
                        </div>

                        {/* COUNTDOWN */}
                        <div className={`text-xs font-bold mt-1 ${isClosingSoon ? "text-red-600" : "text-blue-600"}`}>
                          ⏳ Order before: {timeText}
                          {isClosingSoon && " ⚠ Closing soon"}
                        </div>
                      </div>

                      {/* BUTTON */}
                      <div className="text-right">
                        <a
                          href={`/Stations/${stationCode}-${stationName}/${r.RestroCode}-${r.RestroName}?date=${deliveryDate}&train=${trainNumber}&boarding=${boarding}&arrival=${arrives}`}
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