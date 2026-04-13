"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type MenuItem = {
  item_code: string;
  item_name: string;
  item_description: string;
  selling_price: number;
  menu_type: string;
  status: string;
  start_time?: string;
  end_time?: string;
};

export default function MenuPage() {
  const params = useSearchParams();

  const restro = params.get("restro");
  const arrival = params.get("arrival");

  const [items, setItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(
        `/api/getMenu?restro=${restro}&arrival=${arrival}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      // 🔥 FINAL HARD FILTER
      const cleanItems = (data.items || []).filter(
        (item: MenuItem) => item.item_name !== "Chicken Curry"
      );

      setItems(cleanItems);
    }

    if (restro && arrival) load();
  }, [restro, arrival]);

  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    acc[item.menu_type] ||= [];
    acc[item.menu_type].push(item);
    return acc;
  }, {});

  return (
    <div className="p-4">
      {Object.entries(grouped).map(([type, list]) => (
        <div key={type}>
          <h2 className="font-bold mb-2">{type}</h2>

          {list.map(item => (
            <div key={item.item_code} className="border p-2 mb-2">
              <div>{item.item_name}</div>
              <div>₹{item.selling_price}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
