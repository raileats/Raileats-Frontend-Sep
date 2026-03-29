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

  const [data, setData] = useState<any[]>([]);
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
          setData(json.stations);
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
    return (
      <div className="p-6 text-center">
        Loading train restaurants...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {data.length === 0 ? (
        <div>No restaurants found</div>
      ) : (
        data.map((station: any) => (
          <div key={station.stationCode} className="border p-3 rounded">
            <h2 className="font-bold mb-2">
              {station.stationName} ({station.stationCode})
            </h2>

            {station.vendors.map((r: any) => (
              <div key={r.RestroCode} className="p-2 border mb-2 rounded">
                <div className="font-medium">{r.RestroName}</div>
                <div className="text-sm text-gray-500">
                  Min Order ₹{r.MinimumOrderValue}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
