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
  gst_percent?: number | null;
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
  offer: { text: string } | null;
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
  if (isVegLike(cat))
    return <span className="inline-block w-3 h-3 rounded-full bg-green-600" />;
  if (isNonVeg(cat))
    return <span className="inline-block w-3 h-3 rounded-full bg-red-600" />;
  return <span className="inline-block w-3 h-3 rounded-full bg-gray-400" />;
};

const t = (s?: string | null) => (s ? s.slice(0, 5) : "");

const priceStr = (n?: number | null) =>
  typeof n === "number"
    ? `₹${Number(n).toFixed(2).replace(/\.00$/, "")}`
    : "—";

// ✅ TIME CONVERT
const timeToMin = (t?: string | null) => {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
};

export default function RestroMenuClient({ header, items, offer }: Props) {
  const [vegOnly, setVegOnly] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);

  const { lines, count, total, add, changeQty, remove, clearCart } = useCart();

  // ✅ GET ARRIVAL TIME
  const arrivalMin = useMemo(() => {
    if (typeof window === "undefined") return 0;

    const u = new URL(window.location.href);
    const arrival =
      u.searchParams.get("arrivalTime") ||
      u.searchParams.get("arrival") ||
      "00:00";

    return timeToMin(arrival);
  }, []);

  // ✅ FINAL FILTER (MAIN FIX)
  const visible = useMemo(() => {
    return (items || []).filter((x) => {
      if (x.status !== "ON") return false;

      const startMin = timeToMin(x.start_time || "00:00");
      const endMin = timeToMin(x.end_time || "23:59");

      let isOpen = false;

      if (endMin >= startMin) {
        isOpen = arrivalMin >= startMin && arrivalMin <= endMin;
      } else {
        isOpen = arrivalMin >= startMin || arrivalMin <= endMin;
      }

      if (!isOpen) return false;

      if (vegOnly && !isVegLike(x.item_category)) return false;

      return true;
    });
  }, [items, vegOnly, arrivalMin]);

  // grouping
  const grouped = useMemo(() => {
    const by = new Map<string, MenuItem[]>();

    for (const it of visible) {
      const k = it.menu_type?.trim() || "Others";
      const list = by.get(k);
      list ? list.push(it) : by.set(k, [it]);
    }

    const out: { type: string; items: MenuItem[] }[] = [];
    const used = new Set<string>();

    for (const t of ORDER_MENU_TYPES) {
      const list = by.get(t);
      if (list) {
        out.push({ type: t, items: list });
        used.add(t);
      }
    }

    by.forEach((list, k) => {
      if (!used.has(k)) out.push({ type: k, items: list });
    });

    return out;
  }, [visible]);

  const getQty = (id: number) => lines.find((l) => l.id === id)?.qty ?? 0;

  const addOne = (it: MenuItem) => {
    const price = Number(it.base_price || 0);
    if (!price) return;
    add({ id: it.id, name: it.item_name, price, qty: 1 });
  };

  return (
    <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* LEFT */}
      <div className="lg:col-span-2">

        {/* HEADER */}
        <div className="flex justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">{header.outletName}</h1>
            <div className="text-sm text-gray-500">
              {header.stationCode} • {header.stationName}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" onChange={(e)=>setVegOnly(e.target.checked)} />
            Veg only
          </label>
        </div>

        {/* MENU */}
        {grouped.length === 0 ? (
          <div className="text-gray-500">No items available</div>
        ) : (
          grouped.map((g) => (
            <div key={g.type} className="mb-5">
              <h2 className="font-semibold mb-2">{g.type}</h2>

              {g.items.map((it) => {
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
                      {t(it.start_time)} - {t(it.end_time)}
                    </div>

                    <div className="mt-2">
                      {qty === 0 ? (
                        <button
                          onClick={() => addOne(it)}
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
          <p className="text-sm text-gray-500">Cart is empty</p>
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
