"use client";

import { useState, useMemo } from "react";
import { useCart } from "../../../lib/useCart";
import CartPillMobile from "../../../components/CartPillMobile";

/* ================= TIME ================= */
const toMin = (t?: string | null) => {
  if (!t) return null;

  let str = t.toString().trim();

  if (str.length >= 8) str = str.slice(0, 5);

  const [h, m] = str.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;

  return h * 60 + m;
};

/* ================= COMPONENT ================= */

export default function RestroMenuClient({ items, header }: any) {
  const { add, changeQty, cart } = useCart();
  const [vegOnly, setVegOnly] = useState(false);

  /* 🔥 TRAIN TIME */
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );

  const trainTime = params.get("time") || "11:50";
  const trainMin = toMin(trainTime) || 710;

  /* ================= FILTER ================= */

  const visible = useMemo(() => {
    return items.filter((it: any) => {
      if (it.status !== "ON") return false;

      const s = toMin(it.item_start_time);
      const e = toMin(it.item_end_time);

      // 🔥 TIMING FILTER
      if (s !== null && e !== null) {
        if (!(trainMin >= s && trainMin <= e)) return false;
      }

      // 🔥 VEG FILTER
      if (vegOnly && !it.is_veg) return false;

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
                      it.is_veg ? "bg-green-600" : "bg-red-600"
                    }`}
                  />
                  <span className="text-sm font-medium">
                    {it.item_name}
                  </span>
                </div>

                {/* ✅ TIME */}
                {it.item_start_time && (
                  <div className="text-xs text-gray-500">
                    ⏱ {it.item_start_time} - {it.item_end_time}
                  </div>
                )}

                {/* ✅ DESCRIPTION */}
                {it.description && (
                  <div className="text-xs text-gray-600">
                    {it.description}
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

      {/* CART BUTTON */}
      <CartPillMobile />
    </div>
  );
}
