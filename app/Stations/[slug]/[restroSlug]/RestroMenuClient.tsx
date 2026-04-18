"use client";

import { useState } from "react";
import { useCart } from "../../../lib/useCart";

type Item = {
  id: number;
  item_name: string;
  base_price: number;
  is_veg?: boolean;
  start_time?: string | null;
  end_time?: string | null;
  item_description?: string | null;
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
    <div className="p-4 max-w-3xl mx-auto">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold">{header.outletName}</h1>
          <div className="text-gray-500 text-sm">
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

      {/* MENU LIST (VERTICAL) */}
      <div className="space-y-4">

        {filteredItems.map((it) => {
          const qty = getQty(it.id);

          return (
            <div
              key={it.id}
              className="border-b pb-4 flex justify-between gap-4"
            >
              {/* LEFT SIDE */}
              <div className="flex-1">

                {/* NAME + VEG DOT */}
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

                {/* TIME */}
                {(it.start_time || it.end_time) && (
                  <div className="text-xs text-gray-500 mt-1">
                    {it.start_time} - {it.end_time}
                  </div>
                )}

                {/* DESCRIPTION */}
                {it.item_description && (
                  <div className="text-sm text-gray-600 mt-1">
                    {it.item_description}
                  </div>
                )}
              </div>

              {/* RIGHT SIDE */}
              <div className="flex flex-col items-end justify-between">

                {/* PRICE */}
                <div className="font-semibold">
                  ₹{it.base_price}
                </div>

                {/* BUTTON / QTY */}
                {qty === 0 ? (
                  <button
                    className="mt-2 bg-green-600 text-white px-4 py-1 rounded text-sm"
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
                  <div className="mt-2 flex items-center gap-2 border rounded px-2 py-1">
                    <button
                      onClick={() => changeQty(it.id, qty - 1)}
                    >
                      -
                    </button>

                    <span>{qty}</span>

                    <button
                      onClick={() => changeQty(it.id, qty + 1)}
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
  );
}
