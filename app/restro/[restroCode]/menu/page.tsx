"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type MenuItem = {
  item_code: string;
  item_name: string;
  item_description: string;
  item_category: string;
  item_cuisine: string;
  menu_type: string;
  menu_type_rank: number;
  base_price: number;
  gst_percent: number;
  selling_price: number;
};

export default function RestroMenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const restroCode = params.restroCode as string;
  const arrivalTime = searchParams.get("arrivalTime") || "";

  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState<Record<string, MenuItem[]>>({});

  useEffect(() => {
    if (!restroCode || !arrivalTime) return;

    fetch(
      `/api/restro-menu?restroCode=${restroCode}&arrivalTime=${arrivalTime}`
    )
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          const grouped: Record<string, MenuItem[]> = {};

          for (const item of data.items as MenuItem[]) {
            if (!grouped[item.menu_type]) {
              grouped[item.menu_type] = [];
            }
            grouped[item.menu_type].push(item);
          }

          setMenu(grouped);
        }
      })
      .finally(() => setLoading(false));
  }, [restroCode, arrivalTime]);

  if (loading) {
    return <div className="p-4">Loading menu...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">
        Menu – Restro {restroCode}
      </h1>

      {Object.keys(menu).length === 0 && (
        <div>No menu available at this time.</div>
      )}

      {Object.entries(menu).map(([menuType, items]) => (
        <div key={menuType}>
          <h2 className="text-lg font-semibold mb-2">
            {menuType}
          </h2>

          <div className="space-y-3">
            {items.map(item => (
              <div
                key={item.item_code}
                className="border rounded p-3 flex justify-between"
              >
                <div>
                  <div className="font-medium">{item.item_name}</div>
                  <div className="text-sm text-gray-600">
                    {item.item_description}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold">
                    ₹{item.selling_price}
                  </div>
                  <div className="text-xs text-gray-500">
                    Incl. GST
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
