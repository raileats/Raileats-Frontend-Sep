"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "../../../lib/useCart";

/* ================= TYPES ================= */

type MenuItem = {
  id: number;
  item_name: string;
  item_description?: string | null;
  item_category?: string | null;
  menu_type?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  base_price?: number | null;
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

/* ================= HELPERS ================= */

const timeToMin = (t?: string | null) => {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
};

const isVeg = (c?: string | null) =>
  ["veg", "jain"].includes(String(c).toLowerCase());

const dot = (c?: string | null) => (
  <span
    className={`w-3 h-3 rounded-full ${
      isVeg(c) ? "bg-green-600" : "bg-red-600"
    }`}
  />
);

const price = (p?: number | null) =>
  typeof p === "number" ? `₹${p}` : "—";

/* ================= COMPONENT ================= */

export default function RestroMenuClient({ header, items }: Props) {
  const { items: cartItems, count, total, add, changeQty } = useCart();

  const [vegOnly, setVegOnly] = useState(false);

  /* ===== TRAIN TIME ===== */
  const trainMin = useMemo(() => {
    if (typeof window === "undefined") return 0;

    const url = new URL(window.location.href);
    const t =
      url.searchParams.get("arrivalTime") ||
      url.searchParams.get("arrival") ||
      "00:00";

    return timeToMin(t);
  }, []);

  /* ===== FILTER ===== */
  const visible = useMemo(() => {
    return items.filter((it) => {
      if (it.status && it.status !== "ON") return false;

      const s = timeToMin(it.start_time || "00:00");
      const e = timeToMin(it.end_time || "23:59");

      let ok = false;

      if (e >= s) ok = trainMin >= s && trainMin <= e;
      else ok = trainMin >= s || trainMin <= e;

      if (!ok) return false;

      if (vegOnly && !isVeg(it.item_category)) return false;

      return true;
    });
  }, [items, vegOnly, trainMin]);

  const getQty = (id: number) =>
    cartItems.find((i) => i.id === id)?.qty || 0;

  /* ================= UI ================= */

  return (
    <div className="max-w-6xl mx-auto p-4 grid lg:grid-cols-3 gap-6">

      {/* ===== LEFT MENU ===== */}
      <div className="lg:col-span-2">

        {/* HEADER */}
        <div className="flex justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">{header.outletName}</h1>
            <div className="text-sm text-gray-500">
              {header.stationCode}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              onChange={(e) => setVegOnly(e.target.checked)}
            />
            Veg only
          </label>
        </div>

        {/* ITEMS */}
        {visible.length === 0 ? (
          <div className="text-gray-500 mt-10">
            No items available at this time
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((it) => {
              const qty = getQty(it.id);

              return (
                <div
                  key={it.id}
                  className="border rounded-lg p-4 bg-white shadow-sm"
                >
                  {/* TOP */}
                  <div className="flex justify-between">

                    <div className="flex-1">

                      {/* NAME */}
                      <div className="flex items-center gap-2">
                        {dot(it.item_category)}
                        <span className="font-medium">
                          {it.item_name}
                        </span>
                      </div>

                      {/* TIME */}
                      <div className="text-xs text-gray-500 mt-1">
                        {it.start_time} - {it.end_time}
                      </div>

                      {/* DESC */}
                      {it.item_description && (
                        <div className="text-sm text-gray-600 mt-1">
                          {it.item_description}
                        </div>
                      )}
                    </div>

                    {/* PRICE */}
                    <div className="font-semibold">
                      {price(it.base_price)}
                    </div>
                  </div>

                  {/* BUTTON */}
                  <div className="mt-3">
                    {qty === 0 ? (
                      <button
                        onClick={() =>
                          add({
                            id: it.id,
                            name: it.item_name,
                            price: Number(it.base_price || 0),
                            qty: 1,
                          })
                        }
                        className="w-full bg-green-600 text-white py-2 rounded"
                      >
                        Add
                      </button>
                    ) : (
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => changeQty(it.id, qty - 1)}
                          className="px-3 border rounded"
                        >
                          -
                        </button>

                        <span>{qty}</span>

                        <button
                          onClick={() => changeQty(it.id, qty + 1)}
                          className="px-3 border rounded"
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
        )}
      </div>

      {/* ===== RIGHT CART (DESKTOP) ===== */}
      <div className="hidden lg:block border p-4 rounded sticky top-20 h-fit">
        <h3 className="font-semibold mb-2">Your Cart</h3>

        {count === 0 ? (
          <p className="text-sm text-gray-500">Cart empty</p>
        ) : (
          <>
            {cartItems.map((c) => (
              <div key={c.id} className="flex justify-between text-sm mb-1">
                <span>{c.name}</span>
                <span>x{c.qty}</span>
              </div>
            ))}

            <div className="mt-2 font-bold">₹{total}</div>

            <Link
              href="/checkout"
              className="block bg-green-600 text-white text-center py-2 mt-2 rounded"
            >
              Checkout
            </Link>
          </>
        )}
      </div>

      {/* ===== FLOATING CART (MOBILE) ===== */}
      {count > 0 && (
        <Link
          href="/checkout"
          className="fixed bottom-20 right-4 bg-blue-600 text-white px-4 py-2 rounded-full shadow lg:hidden"
        >
          {count} items • ₹{total}
        </Link>
      )}
    </div>
  );
}
