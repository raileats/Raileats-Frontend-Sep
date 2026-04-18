"use client";

import { useState, useMemo } from "react";
import { useCart } from "../../../lib/useCart";
import CartPillMobile from "../../../components/CartPillMobile";

/* 🔥 UNIVERSAL FIELD GET */
const get = (it: any, keys: string[]) => {
  for (let k of keys) {
    if (it[k] !== undefined && it[k] !== null && it[k] !== "") {
      return it[k];
    }
  }
  return null;
};

/* 🔥 TIME */
const toMin = (t?: string | null) => {
  if (!t) return null;

  let str = t.toString().trim();
  if (str.length >= 8) str = str.slice(0, 5);

  const [h, m] = str.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;

  return h * 60 + m;
};

export default function RestroMenuClient({ items, header }: any) {
  const { add, changeQty, cart } = useCart();
  const [vegOnly, setVegOnly] = useState(false);

  /* TRAIN TIME */
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );

  const trainTime =
    params.get("arrivalTime") ||
    params.get("time") ||
    "11:50";

  const trainMin = toMin(trainTime) || 710;

  /* FILTER */
  const visible = useMemo(() => {
    return items.filter((it: any) => {
      const status = get(it, ["status", "Status"]);
      if (status && status !== "ON") return false;

      const start = get(it, [
        "item_start_time",
        "ItemStartTime",
        "start_time",
      ]);

      const end = get(it, [
        "item_end_time",
        "ItemEndTime",
        "end_time",
      ]);

      const s = toMin(start);
      const e = toMin(end);

      if (s !== null && e !== null) {
        if (!(trainMin >= s && trainMin <= e)) return false;
      }

      const veg =
        get(it, ["is_veg", "IsVeg"]) ??
        String(get(it, ["item_category", "category"])).toLowerCase().includes("veg");

      if (vegOnly && !veg) return false;

      return true;
    });
  }, [items, vegOnly]);

  return (
    <div className="p-3 max-w-xl mx-auto">

      {/* HEADER */}
      <div className="flex justify-between mb-3">
        <div>
          <h1 className="font-semibold">{header.outletName}</h1>
          <div className="text-xs text-gray-500">{header.stationCode}</div>
        </div>

        <label className="text-sm flex gap-1">
          <input
            type="checkbox"
            checked={vegOnly}
            onChange={(e) => setVegOnly(e.target.checked)}
          />
          Veg only
        </label>
      </div>

      {visible.length === 0 && (
        <div className="text-center text-gray-500 mt-10">
          No items available at this time
        </div>
      )}

      <div className="space-y-3">
        {visible.map((it: any) => {
          const existing = cart[it.id];

          const desc = get(it, [
            "description",
            "item_description",
            "ItemDescription",
          ]);

          const start = get(it, [
            "item_start_time",
            "ItemStartTime",
          ]);

          const end = get(it, [
            "item_end_time",
            "ItemEndTime",
          ]);

          const isVeg =
            get(it, ["is_veg", "IsVeg"]) ??
            String(get(it, ["item_category"])).toLowerCase().includes("veg");

          return (
            <div
              key={it.id}
              className="border rounded-lg p-3 flex justify-between"
            >
              <div>
                <div className="flex gap-2 items-center">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isVeg ? "bg-green-600" : "bg-red-600"
                    }`}
                  />
                  <span className="text-sm font-medium">
                    {it.item_name}
                  </span>
                </div>

                {start && (
                  <div className="text-xs text-gray-500">
                    ⏱ {start} - {end}
                  </div>
                )}

                {desc && (
                  <div className="text-xs text-gray-600">
                    {desc}
                  </div>
                )}

                <div className="font-semibold">
                  ₹{it.base_price}
                </div>
              </div>

              <div>
                {!existing ? (
                  <button
                    className="border px-3 py-1 text-green-600 border-green-600 rounded text-sm"
                    onClick={() =>
                      add({
                        id: it.id,
                        name: it.item_name,
                        price: it.base_price,
                        qty: 1,
                      })
                    }
                  >
                    ADD
                  </button>
                ) : (
                  <div className="flex gap-2 border px-2 py-1 rounded text-sm">
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

      <CartPillMobile />
    </div>
  );
}
