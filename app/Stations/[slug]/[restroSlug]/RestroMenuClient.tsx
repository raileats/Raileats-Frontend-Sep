"use client";

import { useState } from "react";
import { useCart } from "../../../lib/useCart";

/* ================= TYPES ================= */

type Item = {
  id: number;
  item_name: string;
  base_price: number;
  item_category?: string;
  item_description?: string;
  item_start_time?: string;
  item_end_time?: string;
  status?: string;
};

type Header = {
  restroCode: string;
  outletName: string;
  stationCode: string;
  stationName: string;
};

/* ================= HELPERS ================= */

const isVeg = (cat?: string) => {
  return cat?.toLowerCase().includes("veg");
};

const timeToMin = (t?: string | null) => {
  if (!t) return null;
  const clean = t.slice(0, 5); // handle 11:59:00
  const [h, m] = clean.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

/* ================= COMPONENT ================= */

export default function RestroMenuClient({
  items,
  header,
}: {
  items: Item[];
  header: Header;
}) {
  const { add, changeQty, cart } = useCart();
  const [vegOnly, setVegOnly] = useState(false);

  /* 🔥 TEMP FIX TRAIN TIME (11:50 AM) */
  const trainMin = 11 * 60 + 50;

  /* ================= FILTER ================= */

  const visible = items.filter((it) => {
    if (it.status && it.status !== "ON") return false;

    const s = timeToMin(it.item_start_time);
    const e = timeToMin(it.item_end_time);

    if (s !== null && e !== null) {
      let ok = false;

      if (e >= s) {
        ok = trainMin >= s && trainMin <= e;
      } else {
        ok = trainMin >= s || trainMin <= e;
      }

      if (!ok) return false;
    }

    if (vegOnly && !isVeg(it.item_category)) return false;

    return true;
  });

  /* ================= UI ================= */

  return (
    <div className="p-3 max-w-xl mx-auto">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-lg font-semibold">
            {header.outletName}
          </h1>
          <div className="text-xs text-gray-500">
            {header.stationCode}
          </div>
        </div>

        <label className="text-sm flex items-center gap-1">
          <input
            type="checkbox"
            checked={vegOnly}
            onChange={(e) => setVegOnly(e.target.checked)}
          />
          Veg only
        </label>
      </div>

      {/* EMPTY */}
      {visible.length === 0 && (
        <div className="text-center text-gray-500 mt-10">
          No items available at this time
        </div>
      )}

      {/* ITEMS */}
      <div className="space-y-3">
        {visible.map((it) => {
          const existing = cart[it.id];

          return (
            <div
              key={it.id}
              className="border rounded-lg p-3 flex justify-between items-start shadow-sm"
            >

              {/* LEFT SIDE */}
              <div className="flex-1 pr-2">

                {/* NAME + VEG DOT */}
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isVeg(it.item_category)
                        ? "bg-green-600"
                        : "bg-red-600"
                    }`}
                  />
                  <span className="font-medium text-sm">
                    {it.item_name}
                  </span>
                </div>

                {/* TIME */}
                {it.item_start_time && (
                  <div className="text-xs text-gray-500 mt-1">
                    ⏱ {it.item_start_time?.slice(0, 5)} -{" "}
                    {it.item_end_time?.slice(0, 5)}
                  </div>
                )}

                {/* DESCRIPTION */}
                {it.item_description && (
                  <div className="text-xs text-gray-600 mt-1">
                    {it.item_description}
                  </div>
                )}

                {/* PRICE */}
                <div className="text-sm font-semibold mt-1">
                  ₹{it.base_price}
                </div>
              </div>

              {/* RIGHT SIDE */}
              <div className="flex flex-col items-end">

                {!existing ? (
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
                    ADD
                  </button>
                ) : (
                  <div className="flex items-center gap-2 border rounded px-2 py-1">
                    <button
                      onClick={() =>
                        changeQty(it.id, existing.qty - 1)
                      }
                    >
                      -
                    </button>

                    <span>{existing.qty}</span>

                    <button
                      onClick={() =>
                        changeQty(it.id, existing.qty + 1)
                      }
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
