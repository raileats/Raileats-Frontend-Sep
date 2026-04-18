"use client";

import { useState } from "react";
import { useCart } from "../../../lib/useCart";

type Item = {
  id: number;
  item_name: string;
  base_price: number;
  is_veg?: boolean;
  item_description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
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
  const { add, changeQty, items: cartItems } = useCart();
  const [vegOnly, setVegOnly] = useState(false);

  const filteredItems = vegOnly
    ? items.filter((i) => i.is_veg)
    : items;

  const getQty = (id: number) => {
    const found = cartItems.find((i) => i.id === id);
    return found?.qty || 0;
  };

  return (
    <div className="max-w-4xl mx-auto px-3 py-4">

      {/* HEADER */}
      <div className="mb-5">
        <h1 className="text-xl font-bold">{header.outletName}</h1>
        <p className="text-sm text-gray-500">{header.stationCode}</p>

        <div className="mt-2 flex gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={vegOnly}
              onChange={(e) => setVegOnly(e.target.checked)}
            />
            Veg Only
          </label>
        </div>
      </div>

      {/* MENU */}
      <div className="space-y-4">

        {filteredItems.map((it) => {
          const qty = getQty(it.id);

          return (
            <div
              key={it.id}
              className="flex justify-between gap-4 border rounded-xl p-3 shadow-sm hover:shadow-md transition"
            >

              {/* LEFT */}
              <div className="flex-1">

                {/* veg + name */}
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      it.is_veg ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></span>

                  <span className="font-semibold text-sm">
                    {it.item_name}
                  </span>
                </div>

                {/* price */}
                <div className="text-sm font-medium mt-1">
                  ₹{it.base_price}
                </div>

                {/* time */}
                {(it.start_time || it.end_time) && (
                  <div className="text-xs text-green-600 mt-1">
                    ⏱ {it.start_time} - {it.end_time}
                  </div>
                )}

                {/* description */}
                {it.item_description && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {it.item_description}
                  </div>
                )}
              </div>

              {/* RIGHT */}
              <div className="flex flex-col items-end justify-between">

                {/* IMAGE (placeholder) */}
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden mb-2">
                  <img
                    src="/food.png"
                    alt="food"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* BUTTON */}
                {qty === 0 ? (
                  <button
                    className="border border-green-600 text-green-600 px-3 py-1 rounded text-sm font-medium"
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
                    ADD +
                  </button>
                ) : (
                  <div className="flex items-center gap-2 border rounded px-2 py-1 text-sm">
                    <button onClick={() => changeQty(it.id, qty - 1)}>
                      -
                    </button>
                    <span>{qty}</span>
                    <button onClick={() => changeQty(it.id, qty + 1)}>
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
  );
}
