"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type MenuItem = {
  item_code: string;
  item_name: string;
  item_description: string;
  selling_price: number;
  item_category: string;
  start_time?: string;
  end_time?: string;
};

export default function MenuPage() {
  const params = useSearchParams();

  const restro = params.get("restro");
  const arrival = params.get("arrival") || "00:00";

  const stationName = params.get("stationName");
  const train = params.get("train");

  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/getMenu?restro=${restro}`);
        const data = await res.json();

        const filtered = (data.items || []).filter((item: MenuItem) => {

          // ❌ REMOVE CHICKEN CURRY
          if (item.item_name === "Chicken Curry") return false;

          const [h, m] = arrival.split(":").map(Number);
          const arrivalMin = h * 60 + m;

          const [sh, sm] = (item.start_time || "00:00").split(":").map(Number);
          const [eh, em] = (item.end_time || "23:59").split(":").map(Number);

          const startMin = sh * 60 + sm;
          const endMin = eh * 60 + em;

          return arrivalMin >= startMin && arrivalMin <= endMin;
        });

        setItems(filtered);

      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [restro, arrival]);

  if (loading) return <div className="p-4">Loading...</div>;

  const grouped: Record<string, MenuItem[]> = {};

  items.forEach((item) => {
    const type = item.item_category || "Other";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(item);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">

      <h1 className="text-2xl font-bold mb-4">
        {stationName || "Station"}
      </h1>

      <p className="mb-6 text-gray-500">
        Train: {train} | Arrival: {arrival}
      </p>

      {Object.entries(grouped).map(([type, list]) => (
        <div key={type} className="mb-6">

          <h2 className="text-lg font-semibold mb-2">{type}</h2>

          {list.map(item => (
            <div
              key={item.item_code}
              className="border p-3 mb-2 rounded flex justify-between"
            >
              <div>
                <div className="font-medium">{item.item_name}</div>

                <div className="text-sm text-gray-500">
                  {item.item_description}
                </div>

                <div className="text-xs text-gray-400">
                  {item.start_time?.slice(0,5)} - {item.end_time?.slice(0,5)}
                </div>

                <div className="font-semibold">
                  ₹{item.selling_price}
                </div>
              </div>

              <button className="bg-green-600 text-white px-3 py-1 rounded">
                Add
              </button>
            </div>
          ))}

        </div>
      ))}

    </div>
  );
}
