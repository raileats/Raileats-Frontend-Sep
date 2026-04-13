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
  const arrivalTime = arrivalTimeRaw.slice(0, 5);

  const stationName = resolvedSearchParams.stationName || stationCode;

  /* ================= FETCH MENU (DB FILTER) ================= */

  const arrival = arrivalTime; // "11:50"

 const { data: rawItems } = await serviceClient
  .from("RestroMenuItems")
  .select("*")
  .eq("restro_code", "1004");

const arrivalMin =
  parseInt(arrivalTime.split(":")[0]) * 60 +
  parseInt(arrivalTime.split(":")[1]);

const items = (rawItems || []).filter((item: any) => {
  const start = item.start_time?.slice(0, 5) || "00:00";
  const end = item.end_time?.slice(0, 5) || "23:59";

  const startMin =
    parseInt(start.split(":")[0]) * 60 +
    parseInt(start.split(":")[1]);

  const endMin =
    parseInt(end.split(":")[0]) * 60 +
    parseInt(end.split(":")[1]);

  return arrivalMin >= startMin && arrivalMin <= endMin;
});
  /* ================= GROUP ================= */

  const grouped: Record<string, any[]> = {};

  (items || []).forEach((item: any) => {
    const type = item.item_category || "Other";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(item);
  });

  /* ================= UI ================= */

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">

      <h1 className="text-2xl font-bold mb-4">
        {stationName}
      </h1>

      <p className="mb-6 text-gray-500">
        Arrival: {arrivalTime}
      </p>

      {Object.keys(grouped).length === 0 && (
        <div className="text-red-500">
          No items available for this time
        </div>
      )}

      {Object.entries(grouped).map(([type, list]) => (
        <div key={type} className="mb-6">

          <h2 className="text-lg font-semibold mb-2">
            {type}
          </h2>

          {list.map((item: any) => (
            <div
              key={item.item_code}
              className="border p-3 mb-2 rounded flex justify-between"
            >
              <div>
                <div className="font-medium">{item.item_name}</div>

                <div className="text-sm text-gray-500">
                  {item.item_description}
                </div>

                <div className="text-sm">
                  {item.start_time?.slice(0,5)} - {item.end_time?.slice(0,5)}
                </div>

                <div className="font-semibold">
                  ₹{item.selling_price}
                </div>
              </div>

              <button className="bg-green-600 text-white px-3 py-1 rounded h-fit">
                Add
              </button>
            </div>
          ))}

        </div>
      ))}

    </main>
  );
}
