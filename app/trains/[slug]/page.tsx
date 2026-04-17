"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

const SUPABASE_URL = "https://ygisiztmuzwxpnvhwrmr.supabase.co";

/* ================= HELPERS ================= */

function timeToMinutes(t: string) {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(t: string) {
  if (!t) return "00:00";
  return t.slice(0, 5);
}

/* ================= PAGE ================= */

export default function TrainPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = (params as any)?.slug || "";
  const trainNumber = slug.match(/^(\d+)/)?.[1] || "";
  const urlDate = searchParams.get("date") || "";
  const boarding = (searchParams.get("boarding") || "").toUpperCase();

  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="font-bold text-gray-700 text-lg">
          We are finding best restaurants for you...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {stations.length === 0 ? (
        <div className="text-center py-20 text-gray-500 font-medium border rounded-xl bg-gray-50">
          No restaurants found for this route.
        </div>
      ) : (
        stations.map((st: any, index: number) => {
          if (!st) return null;

          const stationCode = st.StationCode || "N/A";
          const stationName = st.StationName || "Station";
          const state = st.State || "";

          const arrivesRaw = st.Arrives || "00:00";
          const arrives = formatTime(arrivesRaw);
          const arrivalMin = timeToMinutes(arrives);

          const halt = st.HaltTime || "0m";
          const deliveryDate = st.date || urlDate;

          const vendors = st.vendors || [];

          // ✅ TIME FILTER
          const filteredVendors = vendors.filter((r: any) => {
            const open = formatTime(r.OpenTime || "00:00");
            const close = formatTime(r.ClosedTime || "23:59");

            const openMin = timeToMinutes(open);
            const closeMin = timeToMinutes(close);

            return arrivalMin >= openMin && arrivalMin <= closeMin;
          });

          if (!filteredVendors.length) return null;

          return (
            <div
              key={`${stationCode}-${index}`}
              className="border rounded-xl p-4 bg-gray-50 shadow-sm"
            >
              {/* HEADER */}
              <div className="mb-4 border-b pb-2 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    {stationName} ({stationCode})
                  </h2>
                  <div className="flex gap-2 items-center mt-1">
                    {state && (
                      <span className="text-[10px] text-gray-500 uppercase font-semibold">
                        {state}
                      </span>
                    )}
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded border font-bold">
                      📅 {deliveryDate}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-blue-600">
                    Arrival: {arrives}
                  </div>
                  <div className="text-xs text-gray-600">Halt: {halt}</div>
                </div>
              </div>

              {/* RESTAURANTS */}
              <div className="space-y-3">
                {filteredVendors.map((r: any) => {
                  const restroName = r.RestroName || "Restaurant";
                  const minOrder = r.MinimumOrderValue || 0;

                  const open = formatTime(r.OpenTime);
                  const close = formatTime(r.ClosedTime);

                  let fileName = r.RestroDisplayPhoto
                    ? String(r.RestroDisplayPhoto).split("/").pop()
                    : "";

                  const image = fileName
                    ? `${SUPABASE_URL}/storage/v1/object/public/RestroDisplayPhoto/${fileName}`
                    : null;

                  const isVeg = String(r.IsPureVeg) === "1";

                  return (
                    <div
                      key={r.RestroCode}
                      className="bg-white p-3 rounded-lg border flex gap-3"
                    >
                      <div className="w-24 h-24 bg-gray-100 rounded-md overflow-hidden border">
                        {image ? (
                          <img
                            src={image}
                            alt={restroName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-[10px] text-gray-400">
                            No Image
                          </div>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between">
                            <span className="font-bold">{restroName}</span>
                            <span className="bg-yellow-100 text-yellow-800 text-[10px] px-1 rounded font-bold">
                              ★ {r.RestroRating || "4.2"}
                            </span>
                          </div>

                          <div className="text-[11px] text-gray-600 mt-1">
                            Min. Order: ₹{minOrder} | {open} - {close}
                          </div>

                          <div className="mt-1">
                            {isVeg ? (
                              <span className="text-green-600 text-[10px] font-bold">
                                ● Pure Veg
                              </span>
                            ) : (
                              <span className="text-red-600 text-[10px] font-bold">
                                ● Non Veg
                              </span>
                            )}
                          </div>
                        </div>

                        {/* ✅ FIXED BUTTON */}
                        <div className="mt-2 text-right">
                          <a
                            href={`/Stations/${stationCode}-${stationName.replace(/\s+/g, '-')}/${r.RestroCode}-${restroName.replace(/\s+/g, '-')}` +
                              `?date=${encodeURIComponent(deliveryDate)}` +
                              `&train=${trainNumber}` +
                              `&boarding=${boarding}` +
                              `&stationName=${encodeURIComponent(stationName)}` +
                              `&arrival=${arrives}` +
                              `&halt=${halt}`
                            }
                            className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg"
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
        })
      )}
    </div>
  );
}
