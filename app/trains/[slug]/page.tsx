"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

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

        if (json?.stations) {
          setStations(json.stations);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    if (trainNumber) fetchData();
  }, [trainNumber, date, boarding]);

  if (loading) {
    return <div className="p-6 text-center">Loading train restaurants...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {stations.length === 0 ? (
        <div>No restaurants found</div>
      ) : (
        stations.map((st: any) => {
          const stationCode = st.stationCode || st.StationCode;
          const stationName = st.stationName || st.StationName || "";
          const state = st.state || st.State || "";

          const vendors = st.vendors || [];

          if (!vendors.length) return null;

          return (
            <div key={stationCode} className="border rounded p-4 bg-gray-50">
              
              {/* ✅ Station Header */}
              <div className="mb-3">
                <h2 className="text-lg font-bold">
                  {stationName} ({stationCode})
                </h2>
                {state && (
                  <div className="text-sm text-gray-600">{state}</div>
                )}
              </div>

              {/* ✅ Restaurants */}
              <div className="space-y-3">
                {vendors.map((r: any) => {
                  const name = r.RestroName || r.restroName;
                  const minOrder =
                    r.MinimumOrderValue ||
                    r.MinimumOrdermValue ||
                    "—";

                  const open =
                    r.open_time || r.OpenTime || "—";
                  const close =
                    r.closed_time || r.ClosedTime || "—";

                  const isVeg = r.IsPureVeg === 1;

                  return (
                    <div
                      key={r.RestroCode}
                      className="bg-white p-3 rounded border"
                    >
                      <div className="font-semibold">{name}</div>

                      <div className="text-sm text-gray-600 mt-1">
                        ₹{minOrder} • {open} - {close}
                      </div>

                      <div className="text-sm mt-1">
                        {isVeg ? (
                          <span className="text-green-600">Veg</span>
                        ) : (
                          <span className="text-red-600">Non-Veg</span>
                        )}
                      </div>

                      {/* ✅ Button */}
                      <div className="mt-2">
                        <a
                          href={`/Stations/${stationCode}/${r.RestroCode}-${name}`}
                          className="inline-block bg-green-600 text-white px-3 py-1 rounded"
                        >
                          Order Now
                        </a>
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
