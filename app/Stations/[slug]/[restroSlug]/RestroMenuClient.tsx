"use client";

import { useState } from "react";
import { useCart } from "../../../lib/useCart";

type Item = {
  id: number;
  item_name: string;
  base_price: number;
  is_veg?: boolean;
  item_category?: string;
};

type Header = {
  restroCode: string;
  outletName: string;
  stationCode: string;
  stationName: string;
};

export default function RestroMenuClient({
  items,
  header,
}: {
  items: Item[];
  header: Header;
}) {
  const { add, changeQty, cart } = useCart();

  const [vegOnly, setVegOnly] = useState(false);

  /* FILTER */
  const filteredItems = vegOnly
    ? items.filter((i) => i.is_veg)
    : items;

  /* GROUP BY CATEGORY (ADVANCED FEATURE) */
  const grouped: Record<string, Item[]> = {};

  filteredItems.forEach((item) => {
    const key = item.item_category || "Others";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  return (
    <div className="max-w-6xl mx-auto p-4">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold">{header.outletName}</h1>
          <div className="text-sm text-gray-500">
            {header.stationCode}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={vegOnly}
            onChange={(e) => setVegOnly(e.target.checked)}
          />
          Veg only
        </label>
      </div>

      {/* CATEGORY SECTIONS */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([category, list]) => (
          <div key={category}>
            
            {/* CATEGORY TITLE */}
            <h2 className="text-md font-semibold mb-3">
              {category}
            </h2>

            {/* GRID (2 PER ROW) */}
            <div className="grid grid-cols-2 gap-4">
              {list.map((it) => {
                const existing = cart[it.id];

                return (
                  <div
                    key={it.id}
                    className="border rounded-xl p-3 flex flex-col justify-between shadow-sm hover:shadow-md transition"
                  >
                    {/* TOP */}
                    <div>
                      <div className="flex items-center gap-2">
                        {/* VEG/NONVEG DOT */}
                        <span
                          className={`w-3 h-3 rounded-full ${
                            it.is_veg
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                        ></span>

                        <span className="font-medium text-sm line-clamp-2">
                          {it.item_name}
                        </span>
                      </div>

                      {/* PRICE */}
                      <div className="text-sm text-gray-600 mt-1">
                        ₹{it.base_price}
                      </div>
                    </div>

                    {/* ACTION BUTTON */}
                    <div className="mt-3">
                      {!existing ? (
                        <button
                          className="w-full bg-green-600 text-white py-1.5 rounded-md text-sm hover:bg-green-700"
                          onClick={() =>
                            add({
                              id: it.id,
                              name: it.item_name,
                              price: Number(it.base_price || 0),
                              qty: 1,
                              restro_code: header.restroCode,
                              restro_name: header.outletName,
                              station_code: header.stationCode,
                              station_name: header.stationName,
                            })
                          }
                        >
                          Add
                        </button>
                      ) : (
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() =>
                              changeQty(it.id, existing.qty - 1)
                            }
                            className="px-2 border rounded"
                          >
                            -
                          </button>

                          <span className="font-medium">
                            {existing.qty}
                          </span>

                          <button
                            onClick={() =>
                              changeQty(it.id, existing.qty + 1)
                            }
                            className="px-2 border rounded"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
