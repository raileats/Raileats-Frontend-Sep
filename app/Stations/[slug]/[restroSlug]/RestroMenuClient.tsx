"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "../../../lib/useCart";

// ---- Types ----
type MenuItem = {
  id: number;
  restro_code: string | number;
  item_code?: string | null;
  item_name: string;
  item_description?: string | null;
  item_category?: string | null;
  item_cuisine?: string | null;
  menu_type?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  base_price?: number | null;
  selling_price?: number | null;
  status?: string | null;
};

type Props = {
  header: {
    stationCode: string;
    restroCode: string | number;
    outletName: string;
    stationName?: string;
  };
  items: MenuItem[];
};

// ---- helpers ----
const ORDER_MENU_TYPES = [
  "Thalis","Combos","Breakfast","Rice And Biryani","Roti Paratha",
  "Pizza and Sandwiches","Fast Food","Burger","Starters and Snacks",
  "Sweets","Beverages","Restro Specials","Bakery",
];

const isVegLike = (cat?: string | null) => {
  const c = String(cat || "").toLowerCase();
  return c === "veg" || c === "jain";
};

const isNonVeg = (cat?: string | null) =>
  String(cat || "").toLowerCase() === "non-veg";

const dot = (cat?: string | null) => {
  if (isVegLike(cat)) return <span className="w-3 h-3 bg-green-600 rounded-full" />;
  if (isNonVeg(cat)) return <span className="w-3 h-3 bg-red-600 rounded-full" />;
  return <span className="w-3 h-3 bg-gray-400 rounded-full" />;
};

const priceStr = (n?: number | null) =>
  typeof n === "number" ? `₹${n}` : "—";

// ✅ TIME HELPER (IMPORTANT)
const timeToMinutes = (t?: string | null) => {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.slice(0,5).split(":").map(Number);
  return h * 60 + m;
};

export default function RestroMenuClient({ header, items }: Props) {

  const [vegOnly, setVegOnly] = useState(false);

  const { lines, count, total, add, changeQty, remove, clearCart } = useCart();

  // ✅ GET ARRIVAL TIME FROM URL
  const arrivalMin = useMemo(() => {
    if (typeof window === "undefined") return 0;
    const u = new URL(window.location.href);

    const arrival =
      u.searchParams.get("arrivalTime") ||
      u.searchParams.get("arrival") ||
      "00:00";

    return timeToMinutes(arrival);
  }, []);

  // ✅ 🔥 FINAL FILTER (MAIN FIX)
  const visible = useMemo(() => {
    return (items || []).filter((x) => {
      if (x.status !== "ON") return false;

      const startMin = timeToMinutes(x.start_time || "00:00");
      const endMin = timeToMinutes(x.end_time || "23:59");

      let isOpen = false;

      if (endMin >= startMin) {
        // normal case
        isOpen = arrivalMin >= startMin && arrivalMin <= endMin;
      } else {
        // overnight case
        isOpen = arrivalMin >= startMin || arrivalMin <= endMin;
      }

      if (!isOpen) return false;

      if (vegOnly && !isVegLike(x.item_category)) return false;

      return true;
    });
  }, [items, vegOnly, arrivalMin]);

  const grouped = useMemo(() => {
    const by = new Map<string, MenuItem[]>();
    visible.forEach((it) => {
      const key = it.menu_type || "Others";
      if (!by.has(key)) by.set(key, []);
      by.get(key)!.push(it);
    });

    const result: any[] = [];
    ORDER_MENU_TYPES.forEach((t) => {
      if (by.has(t)) result.push({ type: t, items: by.get(t) });
    });

    by.forEach((v, k) => {
      if (!ORDER_MENU_TYPES.includes(k)) {
        result.push({ type: k, items: v });
      }
    });

    return result;
  }, [visible]);

  const getQty = (id: number) => lines.find((l) => l.id === id)?.qty || 0;

  return (
    <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* LEFT MENU */}
      <div className="lg:col-span-2">

        {/* HEADER */}
        <div className="flex justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">{header.outletName}</h1>
            <p className="text-sm text-gray-500">{header.stationCode}</p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" onChange={(e)=>setVegOnly(e.target.checked)} />
            Veg only
          </label>
        </div>

        {/* ITEMS */}
        {grouped.length === 0 ? (
          <div className="text-gray-500">No items available</div>
        ) : (
          grouped.map((g) => (
            <div key={g.type} className="mb-4">
              <h2 className="font-semibold mb-2">{g.type}</h2>

              {g.items.map((it: MenuItem) => {
                const qty = getQty(it.id);

                return (
                  <div key={it.id} className="border p-3 rounded mb-2">

                    <div className="flex justify-between">
                      <div className="flex gap-2">
                        {dot(it.item_category)}
                        <span>{it.item_name}</span>
                      </div>
                      <span>{priceStr(it.base_price)}</span>
                    </div>

                    <div className="text-xs text-gray-500">
                      {it.start_time} - {it.end_time}
                    </div>

                    <div className="mt-2">
                      {qty === 0 ? (
                        <button
                          onClick={() =>
                            add({ id: it.id, name: it.item_name, price: it.base_price || 0, qty: 1 })
                          }
                          className="bg-green-600 text-white px-3 py-1 rounded"
                        >
                          + Add
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={()=>changeQty(it.id, qty-1)}>-</button>
                          <span>{qty}</span>
                          <button onClick={()=>changeQty(it.id, qty+1)}>+</button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* CART */}
      <div className="border p-4 rounded h-fit sticky top-20">
        <h3 className="font-semibold mb-2">Cart</h3>

        {count === 0 ? (
          <p className="text-sm text-gray-500">Empty</p>
        ) : (
          <>
            {lines.map((l) => (
              <div key={l.id} className="flex justify-between text-sm mb-1">
                <span>{l.name}</span>
                <span>{l.qty}</span>
              </div>
            ))}

            <div className="mt-2 font-bold">₹{total}</div>

            <Link href="/checkout" className="block bg-green-600 text-white text-center py-2 mt-2 rounded">
              Checkout
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
