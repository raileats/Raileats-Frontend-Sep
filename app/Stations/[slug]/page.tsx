import React from "react";
import { serviceClient } from "../../lib/supabaseServer";
import SaveOrderData from "../../components/SaveOrderData";

export const dynamic = "force-dynamic";

function timeToMinutes(t: string) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(t?: string | null) {
  if (!t) return "--:--";
  return t.slice(0, 5);
}

export default async function Page(props: {
  params: Promise<any>;
  searchParams: Promise<any>;
}) {
  const resolvedParams = await props.params;
  const resolvedSearchParams = await props.searchParams;

  const arrival = (resolvedSearchParams.arrival || "00:00").slice(0, 5);
  const arrivalMin = timeToMinutes(arrival);

  // ✅ DATA FROM URL
  const stationName = resolvedSearchParams.stationName || "Station";
  const stationCode = resolvedSearchParams.stationCode || "";
  const deliveryDate = resolvedSearchParams.deliveryDate || "";
  const deliveryTime = resolvedSearchParams.deliveryTime || "";

  /* ================= DB FETCH ================= */

  const { data: items } = await serviceClient
    .from("RestroMenuItems")
    .select("*")
    .eq("restro_code", "1004");

  /* ================= FILTER ================= */

  const filteredItems = (items || []).filter((item: any) => {
    const start = item.start_time?.slice(0, 5) || "00:00";
    const end = item.end_time?.slice(0, 5) || "23:59";

    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);

    if (item.item_name === "Chicken Curry") return false;

    return arrivalMin >= startMin && arrivalMin <= endMin;
  });

  /* ================= GROUP BY MENU_TYPE (ASLI CATEGORY) ================= */

  const grouped: Record<string, any[]> = {};

  filteredItems.forEach((item: any) => {
    // 🔥 FIX: Aapne kaha menu_type me asli category hai (Thalis, Combos, etc.)
    // Isliye grouping ab menu_type ke naam par hogi, item_category par nahi!
    const type = item.menu_type || "Other"; 
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(item);
  });

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">

      <h1 className="text-2xl font-bold mb-2">
        {stationName}
      </h1>

      <p className="mb-6 text-gray-500">
        Arrival: {arrival}
      </p>

      {/* DEBUG */}
      <div className="mb-4 text-sm bg-gray-100 p-2 rounded">
        <p><b>Delivery:</b> {deliveryDate} - {deliveryTime}</p>
        <p><b>Station Code:</b> {stationCode}</p>
      </div>

      {Object.entries(grouped).map(([type, list]) => (
        <div key={type} className="mb-6">

          {/* Ab yahan heading "Thalis" ya "Combos" aayegi, "Veg/Non-Veg" nahi */}
          <h2 className="text-lg font-semibold mb-2">{type}</h2>

          {list.map((item: any) => {
            // 🔥 DOT SYSTEM FIX (Database columns normalized check)
            // item.item_category me agar "Non-Veg" hai toh Red dot dikhana hai
            const cat = String(item.item_category || "").toLowerCase().trim();
            const isVeg = !(cat === "non-veg" || cat === "nonveg");

            return (
              <div
                key={item.item_code}
                className="border p-3 mb-2 rounded flex justify-between"
              >
                <div>
                  <div className="flex gap-2 items-center mb-1">
                    {/* Perfect Dot Indicator based on exact database row */}
                    <span
                      className={`w-3 h-3 rounded-full inline-block shrink-0 ${
                        isVeg ? "bg-green-600" : "bg-red-600"
                      }`}
                    />
                    <div className="font-medium text-gray-900">{item.item_name}</div>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    {item.item_description}
                  </div>
                  <div className="text-sm text-gray-400">
                    {formatTime(item.start_time)} - {formatTime(item.end_time)}
                  </div>
                  <div className="font-semibold text-gray-800">
                    ₹{item.selling_price}
                  </div>
                </div>

                <button className="bg-green-600 text-white px-3 py-1 rounded h-fit">
                  Add
                </button>
              </div>
            );
          })}

        </div>
      ))}

    </main>
  );
}
