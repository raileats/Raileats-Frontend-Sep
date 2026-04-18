"use client";

import { useState } from "react";
import { useCart } from "@/app/lib/useCart";

type Item = {
  id: number;
  item_name: string;
  base_price: number;
  is_veg?: boolean;
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

  const filteredItems = vegOnly
    ? items.filter((i) => i.is_veg)
    : items;

  return (
    <div className="max-w-5xl mx-auto p-4">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-lg font-bold">{header.outletName}</h1>
          <div className="text-sm text-gray-500">{header.stationCode}</div>
        </div>

        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={vegOnly}
            onChange={(e) => setVegOnly(e.target.checked)}
          />
          Veg only
        </label>
      </div>

      {/* LIST */}
     <div className="grid grid-cols-2 gap-4">
        {filteredItems.map((it) => {
          const existing = cart[it.id];

          return (
            <div
              key={it.id}
              className="border-b pb-3 flex justify-between items-start"
            >
              {/* LEFT */}
              <div className="flex-1 pr-3">

                {/* veg dot */}
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      it.is_veg ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></span>

                  <span className="font-medium">
                    {it.item_name}
                  </span>
                </div>

                {/* dummy timing (optional) */}
                <div className="text-xs text-gray-400 mt-1">
                  10:00 - 22:00
                </div>

                {/* ADD / REMOVE */}
                <div className="mt-2">
                  {!existing ? (
                    <button
                      className="text-green-600 text-sm border px-3 py-1 rounded"
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
                      + Add
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <button
                        onClick={() =>
                          changeQty(it.id, existing.qty - 1)
                        }
                        className="px-2 border rounded"
                      >
                        -
                      </button>

                      <span>{existing.qty}</span>

                      <button
                        onClick={() =>
                          changeQty(it.id, existing.qty + 1)
                        }
                        className="px-2 border rounded"
                      >
                        +
                      </button>

                      <button
                        onClick={() => changeQty(it.id, 0)}
                        className="text-red-500 ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT */}
              <div className="text-right font-medium">
                ₹{it.base_price}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
