import React from "react";
import { serviceClient } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";

/* ================= HELPERS ================= */

function timeToMinutes(t: string) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
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

  const arrival = (resolvedSearchParams.arrival || "00:00").slice(0, 5);
  const arrivalMin = timeToMinutes(arrival);

  const stationName = resolvedSearchParams.stationName || stationCode;

  /* ================= FETCH ================= */

  const { data: items } = await serviceClient
    .from("RestroMenuItems")
    .select("*")
    .eq("restro_code", "1004");

  /* ================= HARD FILTER ================= */

  const filteredItems = (items || []).filter((item: any) => {
    const start = item.start_time?.slice(0, 5) || "00:00";
    const end = item.end_time?.slice(0, 5) || "23:59";

    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);

    // 🔥 FORCE REMOVE CHICKEN CURRY
    if (item.item_name === "Chicken Curry") return false;

    return arrivalMin >= startMin && arrivalMin <= endMin;
  });

  /* ================= GROUP ================= */

  const grouped: Record<string, any[]> = {};

  filteredItems.forEach((item: any) => {
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
        Arrival: {arrival}
      </p>

      {Object.keys(grouped).length === 0 && (
        <div className="text-red-500">
          No items available
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
