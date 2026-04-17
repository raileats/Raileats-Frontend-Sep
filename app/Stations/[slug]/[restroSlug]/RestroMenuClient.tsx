"use client";

import { useState } from "react";
import { useCart } from "@/app/lib/useCart";
import CartPillMobile from "@/app/components/CartPillMobile";

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
  const { add } = useCart();

  const [vegOnly, setVegOnly] = useState(false);

  const filteredItems = vegOnly
    ? items.filter((i) => i.is_veg)
    : items;

  return (
    <div className="p-4 max-w-6xl mx-auto">

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

      {/* MENU */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((it) => (
          <div
            key={it.id}
            className="border rounded p-3 flex flex-col justify-between"
          >
            <div>
              <div className="font-medium">{it.item_name}</div>
              <div className="text-sm text-gray-500">
                ₹{it.base_price}
              </div>
            </div>

            <button
              className="mt-3 bg-green-600 text-white px-3 py-1 rounded text-sm"
              onClick={() => {
                add({
                  id: it.id,
                  name: it.item_name,
                  price: Number(it.base_price || 0),
                  qty: 1,

                  restro_code: String(header.restroCode),
                  restro_name: header.outletName,
                  station_code: header.stationCode,
                  station_name: header.stationName,
                });
              }}
            >
              Add
            </button>
          </div>
        ))}
      </div>

      {/* 🔥 MOBILE VIEW CART BUTTON (IMPORTANT FIX) */}
      <CartPillMobile />

    </div>
  );
}
