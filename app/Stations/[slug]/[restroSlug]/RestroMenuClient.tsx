"use client";

import { useState, useMemo } from "react";
import { useCart } from "../../../lib/useCart";
import CartPillMobile from "../../../components/CartPillMobile";
import CartWidget from "../../../components/CartWidget";

/* ================= SAFE GET ================= */
const get = (obj: any, keys: string[]) => {
  for (let k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") {
      return obj[k];
    }
  }
  return null;
};

/* ================= TIME PARSER ================= */
const timeToMin = (t?: string | null) => {
  if (!t) return null;

  let str = t.toString().trim();

  // handle "11:59:00"
  if (str.length >= 8) str = str.slice(0, 5);

  // handle "11:50 AM"
  if (str.toLowerCase().includes("am") || str.toLowerCase().includes("pm")) {
    const date = new Date(`1970-01-01 ${str}`);
    if (!isNaN(date.getTime())) {
      return date.getHours() * 60 + date.getMinutes();
    }
  }

  const [h, m] = str.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;

  return h * 60 + m;
};

/* ================= VEG ================= */
const isVeg = (it: any) => {
  const v = get(it, [
    "IsVeg",
    "is_veg",
    "veg",
    "item_type",
    "category",
  ]);

  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;

  return String(v || "").toLowerCase().includes("veg");
};

/* ================= COMPONENT ================= */

export default function RestroMenuClient({ items, header }: any) {
  const { add, changeQty, cart } = useCart();
  const [vegOnly, setVegOnly] = useState(false);

  /* 🔥 TRAIN TIME FROM URL */
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );

  const urlTime =
    params.get("arrivalTime") ||
    params.get("time") ||
    params.get("trainTime");

  const trainMin = timeToMin(urlTime) ?? 11 * 60 + 50;

  console.log("TRAIN TIME 👉", urlTime, trainMin);

  /* ================= FILTER ================= */

  const visible = useMemo(() => {
    return items.filter((it: any) => {
      const status = get(it, ["status", "Status"]);
      if (status && status !== "ON") return false;

      const start = get(it, [
        "ItemStartTime",
        "item_start_time",
        "start_time",
        "StartTime",
      ]);

      const end = get(it, [
        "ItemEndTime",
        "item_end_time",
        "end_time",
        "EndTime",
      ]);

      const s = timeToMin(start);
      const e = timeToMin(end);

      // 🔥 DEBUG LOG
      console.log("ITEM 👉", it.item_name, start, end, s, e);

      if (s !== null && e !== null) {
        let ok;

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
      <div className="flex justify-between mb-3">
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
            "start_time",
          ]);

          const end = get(it, [
            "ItemEndTime",
            "end_time",
          ]);

          return (
            <div
              key={it.id}
              className="border rounded-lg p-3 flex justify-between"
            >

              {/* LEFT */}
              <div>
                <div className="flex gap-2 items-center">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isVeg(it) ? "bg-green-600" : "bg-red-600"
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

              {/* RIGHT */}
              <div>
                {!existing ? (
                  <button
                    className="border px-3 py-1 text-green-600 border-green-600 rounded"
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
                  <div className="flex gap-2 border px-2 py-1 rounded">
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
