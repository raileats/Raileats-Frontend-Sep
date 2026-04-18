"use client";

import { useState } from "react";
import { useCart } from "../../../lib/useCart";

/* ================= TYPES ================= */

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

/* ================= TIME HELPERS ================= */

// URL se train time nikaalo
function getTrainTime() {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const raw =
    params.get("time") || params.get("arrival") || params.get("date");

  if (!raw) return null;

  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;

  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

// "HH:mm" → minutes
function timeToMinutes(t?: string | null) {
  if (!t) return null;

  const parts = t.split(":");
  if (parts.length !== 2) return null;

  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

/* ================= COMPONENT ================= */

export default function RestroMenuClient({
  items,
  header,
}: {
  items: Item[];
  header: Header;
}) {
  const { add, changeQty, items: cartItems } = useCart();
  const [vegOnly, setVegOnly] = useState(false);

  const trainTime = getTrainTime();

  const getQty = (id: number) => {
    const found = cartItems.find((i) => i.id === id);
    return found?.qty || 0;
  };

  /* ================= FILTER ================= */

  const filteredItems = items.filter((i) => {
    // Veg filter
    if (vegOnly && !i.is_veg) return false;

    // Time filter
    const start = timeToMinutes(i.start_time);
    const end = timeToMinutes(i.end_time);

    if (!trainTime || start === null || end === null) return true;

    // Overnight support (e.g. 22:00 → 02:00)
    if (end < start) {
      return trainTime >= start || trainTime <= end;
    }

    return trainTime >= start && trainTime <= end;
  });

  /* ================= UI ================= */

  return (
    <div className="max-w-4xl mx-auto px-3 py-4">

      {/* HEADER */}
      <div className="mb-5">
        <h1 className="text-xl font-bold">{header.outletName}</h1>
        <p className="text-sm text-gray-500">{header.stationCode}</p>

        <div className="mt-2">
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

      {/* MENU LIST */}
      <div className="space-y-4">

        {filteredItems.map((it) => {
          const qty = getQty(it.id);

          return (
            <div
              key={it.id}
              className="flex justify-between gap-4 border-b pb-4"
            >

              {/* LEFT */}
              <div className="flex-1">

                {/* name + veg */}
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
                  <div className="text-xs text-gray-500 mt-1">
                    {it.item_description}
                  </div>
                )}
              </div>

              {/* RIGHT */}
              <div className="flex flex-col items-end justify-between">

                {/* ADD / QTY */}
                {qty === 0 ? (
                  <button
                    className="border border-green-600 text-green-600 px-3 py-1 rounded text-sm"
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

        {/* EMPTY STATE */}
        {filteredItems.length === 0 && (
          <div className="text-center text-gray-500 py-10">
            No items available at this time
          </div>
        )}

      </div>
    </div>
  );
}
