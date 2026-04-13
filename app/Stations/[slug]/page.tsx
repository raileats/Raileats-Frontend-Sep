import React from "react";
import { serviceClient } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";

/* ================= HELPERS ================= */

function formatTime(t?: string | null) {
  if (!t) return "--:--";
  return t.slice(0, 5);
}

/* ================= PAGE ================= */

export default async function Page(props: {
  params: Promise<any>;
  searchParams: Promise<any>;
}) {
  const resolvedParams = await props.params;
  const resolvedSearchParams = await props.searchParams;

  const slug = resolvedParams.slug || "";
  const stationCode = slug.split("-")[0].toUpperCase();

  const arrivalTimeRaw = resolvedSearchParams.arrival || "00:00";
  const arrivalTime = formatTime(arrivalTimeRaw);

  const stationName = resolvedSearchParams.stationName || stationCode;

  /* ================= FETCH RESTAURANTS ================= */

  const { data: restaurants } = await serviceClient
    .from("RestroMaster")
    .select("*")
    .eq("StationCode", stationCode)
    .eq("IsActive", true);

  /* ================= UI ================= */

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">

      {/* HEADER */}
      <h1 className="text-2xl font-bold mb-2">
        {stationName}
      </h1>

      <p className="text-gray-500 mb-6">
        Arrival: {arrivalTime}
      </p>

      {/* RESTAURANTS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {(restaurants || []).length === 0 && (
          <div className="text-red-500">
            No restaurants available
          </div>
        )}

        {(restaurants || []).map((restro: any) => (
          <div
            key={restro.RestroCode}
            className="border p-5 rounded-xl shadow-sm flex flex-col justify-between"
          >
            <div>
              <h2 className="text-lg font-semibold mb-2">
                {restro.RestroName}
              </h2>

              <p className="text-sm text-gray-500 mb-2">
                Min Order: ₹{restro.MinOrder || 0}
              </p>

              <p className="text-sm text-gray-500">
                Timing: {formatTime(restro.StartTime)} - {formatTime(restro.EndTime)}
              </p>
            </div>

            {/* ORDER BUTTON */}
            <a
              href={`/menu?restro=${restro.RestroCode}&arrival=${arrivalTime}&stationName=${stationName}`}
              className="mt-4 text-center bg-black text-white py-2 rounded"
            >
              Order Now
            </a>

          </div>
        ))}

      </div>

    </main>
  );
}
