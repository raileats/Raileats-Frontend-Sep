"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/* ================= TYPES ================= */

type MenuItem = {
  item_code: string;
  item_name: string;
  item_description: string;
  selling_price: number;
  menu_type: string;
  menu_type_rank: number;
  status: string;
};

type MenuResponse = {
  ok: boolean;
  restroCode: number;
  arrivalTime: string;
  items: MenuItem[];
};

/* ================= PAGE ================= */

export default function MenuPage() {
  const params = useSearchParams();

  const restro = params.get("restro");
  const arrival = params.get("arrival");

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* ================= FETCH ================= */

  useEffect(() => {
    if (!restro || !arrival) {
      setError("Missing menu parameters");
      setLoading(false);
      return;
    }

    async function loadMenu() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/menu?restro=${restro}&arrival=${arrival}`,
          { cache: "no-store" }
        );

        const data: MenuResponse = await res.json();

        if (!data.ok || !data.items?.length) {
          setError("No menu available");
          setItems([]);
        } else {
          setItems(data.items);
        }
      } catch {
        setError("Server error");
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, [restro, arrival]);

  /* ================= GROUP BY MENU TYPE ================= */

  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    acc[item.menu_type] ||= [];
    acc[item.menu_type].push(item);
    return acc;
  }, {});

  /* ================= UI STATES ================= */

  if (loading) return <div className="p-4">Loading menu…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  /* ================= RENDER ================= */

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Menu</h1>

      {Object.entries(grouped).map(([menuType, items]) => (
        <div key={menuType}>
          <h2 className="text-lg font-semibold mb-2">{menuType}</h2>

          <div className="space-y-2">
            {items.map(item => (
              <div
                key={item.item_code}
                className="border rounded-lg p-3 flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">{item.item_name}</div>
                  <div className="text-sm text-gray-600">
                    {item.item_description}
                  </div>
                  <div className="mt-1 font-semibold">
                    ₹{item.selling_price}
                  </div>
                </div>

                <button
                  disabled={item.status !== "ON"}
                  className={`px-3 py-1 rounded ${
                    item.status === "ON"
                      ? "bg-green-600 text-white"
                      : "bg-gray-300 text-gray-600 cursor-not-allowed"
                  }`}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
