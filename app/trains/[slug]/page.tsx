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
function formatDate(date: string) {
  if (!date) return "";

  // handle "27 Apr 2026"
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
function formatTime(t: string) {
  if (!t) return "00:00:00";

  if (t.length === 5) return t + ":00";     // 02:35 → 02:35:00
  if (t.length === 4) return "0" + t + ":00";

  return t;
}

/* ================= MAIN CALC ================= */
function getRemaining(arrival: string, date: string, cutoffMin: number, now: number) {
  try {
    const d = formatDate(date);
    const t = formatTime(arrival);

    const arrivalDateTime = new Date(`${d}T${t}`);

    if (isNaN(arrivalDateTime.getTime())) return 999999999;

    const diff = arrivalDateTime.getTime() - now;

    // 🔥 FINAL LOGIC
    return diff - cutoffMin * 60000;

  } catch {
    return 999999999;
  }
}

/* ================= FORMAT ================= */
function formatCountdown(ms: number) {
  if (ms <= 0) return null;

  let totalSec = Math.floor(ms / 1000);

  const days = Math.floor(totalSec / 86400);
  totalSec %= 86400;

  const hrs = Math.floor(totalSec / 3600);
  totalSec %= 3600;

  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;

  if (days > 0) {
    return `${days}d ${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/* ================= COMPONENT ================= */
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
        const res = await fetch(
          `/api/train-restros?train=${trainNumber}&date=${urlDate}&boarding=${boarding}&full=1`,
          { cache: "no-store" }
        );
        const json = await res.json();
        setStations(json?.stations || []);
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    }

    if (trainNumber) fetchData();
  }, [trainNumber, urlDate, boarding]);

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {stations.map((st: any, index: number) => {
        const stationCode = st.StationCode;
        const stationName = st.StationName;
        const arrives = st.Arrives;
        const deliveryDate = st.date || urlDate;

        const vendors = st.vendors || [];

        /* FILTER */
        const validVendors = vendors.filter((r: any) => {
          const cutoff = Number(r.CutOffTime || r.cutoff_time || 0);
          const remaining = getRemaining(arrives, deliveryDate, cutoff, now);
          return remaining > 0;
        });

        if (!validVendors.length) return null;

        return (
          <div key={index} className="border rounded-xl p-4">

            <h2 className="font-bold">
              {stationName} ({stationCode})
            </h2>

            <div className="text-sm text-gray-500 mb-2">
              {deliveryDate} | Arrival: {arrives}
            </div>

            {validVendors.map((r: any) => {
              const cutoff = Number(r.CutOffTime || r.cutoff_time || 0);
              const remaining = getRemaining(arrives, deliveryDate, cutoff, now);

              const countdown = formatCountdown(remaining);

              const isRed = remaining <= 10 * 60 * 1000;

              return (
                <div key={r.RestroCode} className="border p-3 mb-2 rounded">

                  <div className="font-semibold">{r.RestroName}</div>

                  {/* COUNTDOWN */}
                  {countdown && (
                    <div className={`text-sm font-bold ${isRed ? "text-red-600" : "text-blue-600"}`}>
                      ⏳ {countdown}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
