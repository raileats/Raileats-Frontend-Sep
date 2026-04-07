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

type MenuResponse = {
  ok: boolean;
  items: MenuItem[];
};

export default function MenuPage() {
  const params = useSearchParams();

  const restro = params.get("restro");
  const arrival = params.get("arrival");

  const stationName = params.get("stationName");
  const halt = params.get("halt");
  const train = params.get("train");

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restro || !arrival) {
      setError("Missing params");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setItems([]);
        setError(null);

        const res = await fetch(
          `/api/getMenu?restro=${restro}&arrival=${arrival}`,
          { cache: "no-store" }
        );

        const data: MenuResponse = await res.json();

        if (!data.ok) {
          setError("Server error");
          setItems([]);
        } else {
          // ✅ DIRECT USE (NO EXTRA FILTER)
          setItems(data.items || []);
        }

      } catch {
        setError("Server error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [restro, arrival]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    acc[item.menu_type] ||= [];
    acc[item.menu_type].push(item);
    return acc;
  }, {});

  return (
    <div>

      {/* HEADER */}
      <div style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>
        <div style={{ fontWeight: "bold", fontSize: "18px" }}>
          {stationName || "Station"}
        </div>

        <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>
          Train: {train || "-"} | Arrival: {arrival || "-"} | Halt: {halt || "-"}
        </div>
      </div>

      {/* MENU */}
      <div className="p-4 space-y-6">
        {Object.entries(grouped).map(([type, list]) => (
          <div key={type}>
            <h2 className="font-semibold mb-2">{type}</h2>

            {list.map(item => (
              <div
                key={item.item_code}
                className="border p-3 mb-2 rounded flex justify-between"
              >
                <div>
                  <div>{item.item_name}</div>

                  <div className="text-sm text-gray-500">
                    {item.item_description}
                  </div>

                  {/* ✅ TIME DISPLAY */}
                  <div className="text-xs text-gray-400">
                    {item.start_time?.slice(0,5)} - {item.end_time?.slice(0,5)}
                  </div>

                  <div>₹{item.selling_price}</div>
                </div>

                <button className="bg-green-600 text-white px-3 py-1 rounded">
                  Add
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

    </div>
  );
}
