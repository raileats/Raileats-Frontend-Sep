"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Item = {
  item_code: string;
  item_name: string;
  item_description: string;
  selling_price: number;
  start_time?: string;
  end_time?: string;
  item_category?: string;
};

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function MenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const restro = params?.restroCode;
  const arrival = searchParams.get("arrival") || "00:00";

  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(
        `/api/getMenu?restro=${restro}&arrival=${arrival}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      const arrivalMin = timeToMinutes(arrival);

      // ✅ FINAL FILTER (TIME + HARD REMOVE)
      const filtered = (data.items || []).filter((item: Item) => {
        const start = item.start_time?.slice(0, 5) || "00:00";
        const end = item.end_time?.slice(0, 5) || "23:59";

        const startMin = timeToMinutes(start);
        const endMin = timeToMinutes(end);

        // 🔥 HARD BLOCK
        if (item.item_name === "Chicken Curry") return false;

        return arrivalMin >= startMin && arrivalMin <= endMin;
      });

      setItems(filtered);
    }

    if (restro) load();
  }, [restro, arrival]);

  const grouped = items.reduce<Record<string, Item[]>>((acc, item) => {
    const type = item.item_category || "Other";
    acc[type] ||= [];
    acc[type].push(item);
    return acc;
  }, {});

  return (
    <div className="p-4">

      {Object.entries(grouped).map(([type, list]) => (
        <div key={type} className="mb-4">

          <h2 className="font-bold mb-2">{type}</h2>

          {list.map(item => (
            <div key={item.item_code} className="border p-3 mb-2 rounded">

              <div className="font-medium">{item.item_name}</div>

              <div className="text-sm text-gray-500">
                {item.item_description}
              </div>

              <div className="text-sm text-gray-400">
                {item.start_time?.slice(0,5)} - {item.end_time?.slice(0,5)}
              </div>

              <div className="font-semibold">
                ₹{item.selling_price}
              </div>

            </div>
          ))}

        </div>
      ))}

    </div>
  );
}
