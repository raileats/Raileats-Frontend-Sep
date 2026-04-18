"use client";

import { useState, useMemo } from "react";
import { useCart } from "../../../lib/useCart";
import CartPillMobile from "../../../components/CartPillMobile";
import CartWidget from "../../../components/CartWidget";

/* ================= SAFE FIELD GET ================= */

const get = (obj: any, keys: string[]) => {
  for (let k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") {
      return obj[k];
    }
  }
  return null;
};

/* ================= HELPERS ================= */

const isVeg = (it: any) => {
  const v = get(it, [
    "is_veg",
    "IsVeg",
    "veg",
    "item_type",
    "category",
  ]);

  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;

  return String(v || "").toLowerCase().includes("veg");
};

const timeToMin = (t?: string) => {
  if (!t) return null;
  const clean = t.slice(0, 5);
  const [h, m] = clean.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

/* ================= COMPONENT ================= */

export default function RestroMenuClient({ items, header }: any) {
  const { add, changeQty, cart } = useCart();
  const [vegOnly, setVegOnly] = useState(false);

  /* 🔥 TRAIN TIME (HARDCODE FIX) */
  const trainMin = 11 * 60 + 50;

  /* ================= FILTER ================= */

  const visible = useMemo(() => {
    return items.filter((it: any) => {

      // ✅ STATUS
      const status = get(it, ["status", "Status"]);
      if (status && status !== "ON") return false;

      // ✅ TIME (REAL FIX)
      const start = get(it, [
        "ItemStartTime",
        "item_start_time",
        "start_time",
      ]);

      const end = get(it, [
        "ItemEndTime",
        "item_end_time",
        "end_time",
      ]);

      const s = timeToMin(start);
      const e = timeToMin(end);

      if (s !== null && e !== null) {
        let ok = false;

        if (e >= s) {
          ok = trainMin >= s && trainMin <= e;
        } else {
          ok = trainMin >= s || trainMin <= e;
        }

        if (!ok) return false;
      }

      if (vegOnly && !isVeg(it)) return false;

      return true;
    });
  }, [items, vegOnly]);

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
        {visible.map((it: any) => {
          const existing = cart[it.id];

          const desc = get(it, [
            "ItemDescription",
            "item_description",
            "description",
          ]);

          const start = get(it, [
            "ItemStartTime",
            "item_start_time",
          ]);

          const end = get(it, [
            "ItemEndTime",
            "item_end_time",
          ]);

          return (
            <div
              key={it.id}
              className="border rounded-lg p-3 flex justify-between shadow-sm"
            >

              {/* LEFT */}
              <div className="flex-1 pr-2">

                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isVeg(it)
                        ? "bg-green-600"
                        : "bg-red-600"
                    }`}
                  />
                  <span className="font-medium text-sm">
                    {it.item_name}
                  </span>
                </div>

                {/* TIME */}
                {start && (
                  <div className="text-xs text-gray-500 mt-1">
                    ⏱ {start?.slice(0, 5)} - {end?.slice(0, 5)}
                  </div>
                )}

                {/* DESCRIPTION */}
                {desc && (
                  <div className="text-xs text-gray-600 mt-1">
                    {desc}
                  </div>
                )}

                <div className="font-semibold mt-1">
                  ₹{it.base_price}
                </div>
              </div>

              {/* RIGHT */}
              <div className="flex flex-col items-end justify-between">

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
                    <button onClick={() => changeQty(it.id, existing.qty - 1)}>
                      -
                    </button>
                    <span>{existing.qty}</span>
                    <button onClick={() => changeQty(it.id, existing.qty + 1)}>
                      +
                    </button>
                  </div>
                )}

              </div>

            </div>
          );
        })}
      </div>

      {/* CART */}
      <CartPillMobile />

    </div>
  );
}
