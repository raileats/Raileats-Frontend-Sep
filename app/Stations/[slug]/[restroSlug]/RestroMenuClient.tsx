"use client";

import { useState, useMemo } from "react";
import { useCart } from "../../../lib/useCart";

/* ================= TYPES ================= */

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

/* ================= TIME HELPERS ================= */

function timeToMinutes(t?: string | null) {
  if (!t) return null;
  const parts = t.split(":");
  if (parts.length < 2) return null;
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function getTrainMinutes() {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const raw = params.get("train");

  if (!raw) return null;

  const [h, m] = raw.split(":");
  return Number(h) * 60 + Number(m);
}

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

  const trainTime = getTrainMinutes();

  /* ================= FILTER ================= */

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (vegOnly && !i.is_veg) return false;

      const start = timeToMinutes(i.start_time);
      const end = timeToMinutes(i.end_time);

      // ✅ no timing → show
      if (start === null || end === null) return true;

      if (trainTime === null) return true;

      // overnight case
      if (end < start) {
        return trainTime >= start || trainTime <= end;
      }

      return trainTime >= start && trainTime <= end;
    });
  }, [items, vegOnly, trainTime]);

  /* ================= UI ================= */

  return (
    <div className="p-4 max-w-4xl mx-auto">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold">{header.outletName}</h1>
          <div className="text-gray-500 text-sm">{header.stationCode}</div>
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

      {/* EMPTY */}
      {filteredItems.length === 0 && (
        <div className="text-center text-gray-500 mt-20">
          No items available at this time
        </div>
      )}

      {/* LIST */}
      <div className="space-y-4">
        {filteredItems.map((it) => {
          const existing = cart[it.id];

          return (
            <div
              key={it.id}
              className="border rounded-lg p-4 shadow-sm bg-white"
            >
              {/* TOP ROW */}
              <div className="flex justify-between items-start">

                {/* LEFT */}
                <div className="flex-1">

                  {/* NAME + DOT */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        it.is_veg ? "bg-green-500" : "bg-red-500"
                      }`}
                    />

                    <span className="font-medium text-base">
                      {it.item_name}
                    </span>
                  </div>

                  {/* TIME */}
                  {(it.start_time && it.end_time) && (
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

                {/* RIGHT PRICE */}
                <div className="text-right font-semibold">
                  ₹{it.base_price}
                </div>
              </div>

              {/* ACTION */}
              <div className="mt-3">
                {!existing ? (
                  <button
                    className="w-full bg-green-600 text-white py-2 rounded text-sm"
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
                      onClick={() => changeQty(it.id, existing.qty - 1)}
                      className="px-3 py-1 border rounded"
                    >
                      -
                    </button>

                    <span>{existing.qty}</span>

                    <button
                      onClick={() => changeQty(it.id, existing.qty + 1)}
                      className="px-3 py-1 border rounded"
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
