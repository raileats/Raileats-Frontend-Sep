"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/* ================= TYPES ================= */

type Restro = {
  restroCode: number;
  restroName: string;
  available: boolean;
  reasons: string[];
};

type StationRow = {
  StationCode: string;
  StationName: string;
  Arrives: string;
  arrivalDate: string;
  restros: Restro[];
};

/* ================= PAGE ================= */

export default function SearchPage() {
  const params = useSearchParams();
  const router = useRouter();

  const train = params.get("train") || "";
  const station = params.get("station") || "";
  const date = params.get("date") || "";

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    if (!train || !station || !date) {
      setError("Missing search parameters");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/train-routes?train=${train}&station=${station}&date=${date}`,
          { cache: "no-store" }
        );

        const data = await res.json();

        if (!data.ok || !data.rows?.length) {
          setError("No restaurants available");
          setRows([]);
        } else {
          setRows(data.rows);
        }
      } catch (e) {
        setError("Server error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [train, station, date]);

  /* ================= UI STATES ================= */

  if (loading) {
    return <div className="p-4">Loading food outlets…</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  if (!rows.length) {
    return <div className="p-4">No outlets found</div>;
  }

  // station-wise search → ek hi row hoti hai
  const row = rows[0];

  /* ================= RENDER ================= */

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">
        Food at {row.StationName} ({row.Arrives})
      </h1>

      {row.restros.length === 0 && (
        <div className="text-gray-600">
          No restaurants available for this station
        </div>
      )}

      {row.restros.map(restro => (
        <div
          key={restro.restroCode}
          className="border rounded-lg p-3 flex justify-between items-center"
        >
          <div>
            <div className="font-semibold">{restro.restroName}</div>

            {!restro.available && restro.reasons.length > 0 && (
              <div className="text-sm text-red-500">
                {restro.reasons.join(", ")}
              </div>
            )}
          </div>

          <button
            disabled={!restro.available}
            onClick={() =>
              router.push(
                `/menu?restro=${restro.restroCode}` +
                  `&station=${row.StationCode}` +
                  `&date=${row.arrivalDate}` +
                  `&arrival=${row.Arrives}`
              )
            }
            className={`px-4 py-1 rounded ${
              restro.available
                ? "bg-green-600 text-white"
                : "bg-gray-300 text-gray-600 cursor-not-allowed"
            }`}
          >
            View Menu
          </button>
        </div>
      ))}
    </div>
  );
}
