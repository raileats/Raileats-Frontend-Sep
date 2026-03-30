"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

const SUPABASE_URL = "https://ygisiztmuzwxpnvhwrmr.supabase.co";

export default function TrainPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = (params as any)?.slug || "";
  const trainNumber = slug.match(/^(\d+)/)?.[1] || "";
  const date = searchParams.get("date") || "";
  const boarding = (searchParams.get("boarding") || "").toUpperCase();

  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
          `/api/train-restros?train=${trainNumber}&date=${date}&boarding=${boarding}&full=1`,
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
  }, [trainNumber, date, boarding]);

  if (loading) return <div className="p-6 text-center">Loading train restaurants...</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {stations.length === 0 ? (
        <div className="text-center py-10 font-medium">No restaurants found for this route/date.</div>
      ) : (
        stations.map((st: any) => {
          const stationCode = st.StationCode || st.stationCode;
          const stationName = st.StationName || st.stationName || "";
          const state = st.State || st.state || "";
          
          // ✅ FIX: Inhe use kijiye jo Backend se aa rahe hain
          const arrives = st.Arrives || "--:--";
          const departs = st.Departs || "--:--";
          const halt = st.halt_time || "0m";

          const vendors = st.vendors || [];
          if (!vendors.length) return null;

          return (
            <div key={stationCode} className="border rounded-xl p-4 bg-gray-50 shadow-sm">
              
              {/* ✅ Station Header with Arrives/Departs */}
              <div className="mb-4 border-b pb-2 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    {stationName} ({stationCode})
                  </h2>
                  {state && <div className="text-xs text-gray-500 uppercase font-semibold">{state}</div>}
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-blue-600">Arrives: {arrives}</div>
                  <div className="text-xs text-gray-600">Departs: {departs} | Halt: {halt}</div>
                </div>
              </div>

              {/* ✅ Restaurants List */}
              <div className="space-y-3">
                {vendors.map((r: any) => {
                  const name = r.RestroName || "Restaurant";
                  const minOrder = r.MinimumOrderValue || r.MinimumOrdermValue || 0;
                  const open = r.OpenTime?.slice(0, 5) || "00:00";
const close = r.ClosedTime?.slice(0, 5) || "23:59";

                  // Image Logic
                  let fileName = r.RestroDisplayPhoto ? String(r.RestroDisplayPhoto).split("/").pop() : "";
                  const image = fileName ? `${SUPABASE_URL}/storage/v1/object/public/RestroDisplayPhoto/${fileName}` : null;
                  const isVeg = String(r.IsPureVeg) === "1";

                  return (
                    <div key={r.RestroCode} className="bg-white p-3 rounded-lg border flex gap-3 hover:shadow-md transition-shadow">
                      <div className="w-24 h-24 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 border">
                        {image ? (
                          <img src={image} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-[10px] text-gray-400">No Image</div>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-gray-900">{name}</span>
                            <span className="bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5 rounded font-bold">
                              ★ {r.RestroRating || "4.2"}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Min. Order: ₹{minOrder} | {open} - {close}
                          </div>
                          <div className="mt-1">
                            {isVeg ? (
                              <span className="text-green-600 text-xs font-bold flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-600"></span> Pure Veg
                              </span>
                            ) : (
                              <span className="text-red-600 text-xs font-bold flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-600"></span> Non Veg
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 text-right">
                          <a
                            href={`/Stations/${stationCode}/${r.RestroCode}-${name.replace(/\s+/g, '-')}` +
                              `?stationName=${encodeURIComponent(stationName)}` +
                              `&arrival=${arrives}` + // ✅ Pass fixed timing
                              `&halt=${halt}` +
                              `&train=${trainNumber}`
                            }
                            className="inline-block bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-1.5 rounded-lg transition-colors"
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
