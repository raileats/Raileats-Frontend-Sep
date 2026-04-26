"use client";

import { useAuth } from "../../../lib/useAuth";
import { useState, useMemo } from "react";
import { useCart } from "../../../lib/useCart";
import CartPillMobile from "../../../components/CartPillMobile";

/* ================= TIME CONVERT ================= */
const toMin = (t?: string | null) => {
  if (!t) return null;

  const parts = t.slice(0, 5).split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;

  return h * 60 + m;
};

/* ================= CATEGORY ================= */
const isVegItem = (cat?: string | null) => {
  const c = String(cat || "").toLowerCase().trim();
  return c === "veg" || c === "jain";
};

/* ================= STATUS ================= */
const isItemActive = (it: any) => {
  const raw =
    it.status ??
    it.item_status ??
    it.is_active ??
    it.active;

  return String(raw || "").trim().toUpperCase() === "ON";
};

export default function RestroMenuClient({ items, header }: any) {
  const { add, changeQty, cart } = useCart();
  const [vegOnly, setVegOnly] = useState(false);

  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );

  /* ================= ARRIVAL FIX ================= */
  const arrivalParam = params.get("arrival");

  let trainMin: number | null = null;

  if (arrivalParam && arrivalParam.includes(":")) {
    const clean = arrivalParam.slice(0, 5); // 11:50
    trainMin = toMin(clean);
  }

  /* ================= FINAL FILTER ================= */
  const visible = useMemo(() => {
    return items.filter((it: any) => {

      /* STATUS */
      if (!isItemActive(it)) return false;

      /* TIME FILTER (FINAL FIX) */
      const s = toMin(it.start_time);
      const e = toMin(it.end_time);

      if (trainMin !== null && s !== null && e !== null) {

        if (e >= s) {
          // ✅ normal (10:00 - 22:00)
          if (!(trainMin >= s && trainMin <= e)) return false;
        } else {
          // 🔥 overnight (22:00 - 02:00)
          if (!(trainMin >= s || trainMin <= e)) return false;
        }

      }

      /* VEG FILTER */
      const isVeg =
        isVegItem(it.item_category) ||
        /dal|roti|rice|paneer|veg|thali|chapati|paratha/i.test(
          it.item_name
        );

      if (vegOnly && !isVeg) return false;

      return true;
    });
  }, [items, vegOnly, trainMin]);

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

          const isVeg =
            isVegItem(it.item_category) ||
            /dal|roti|rice|paneer|veg|thali|chapati|paratha/i.test(
              it.item_name
            );

          const description =
            it.item_description ||
            it.description ||
            "";

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

                <div className="text-xs text-gray-500">
                  ⏱{" "}
                  {it.start_time && it.end_time
                    ? `${it.start_time} - ${it.end_time}`
                    : "Available all day"}
                </div>

                {description && (
                  <div className="text-xs text-gray-600">
                    {description}
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