"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/useCart";

/* ================= TYPES ================= */

type MenuItem = {
  id: number;
  item_name: string;
  item_description?: string | null;
  item_category?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  base_price?: number | null;
  status?: string | null;
  menu_type?: string | null;
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

const isVeg = (cat?: string | null) =>
  ["veg", "jain"].includes(String(cat || "").toLowerCase());

const isNonVeg = (cat?: string | null) =>
  String(cat || "").toLowerCase() === "non-veg";

const dot = (cat?: string | null) => {
  if (isVeg(cat)) return <span className="w-3 h-3 bg-green-600 rounded-full inline-block" />;
  if (isNonVeg(cat)) return <span className="w-3 h-3 bg-red-600 rounded-full inline-block" />;
  return <span className="w-3 h-3 bg-gray-400 rounded-full inline-block" />;
};

const price = (n?: number | null) => (n ? `₹${n}` : "—");

/* ================= COMPONENT ================= */

export default function RestroMenuClient({ header, items }: Props) {
  const [vegOnly, setVegOnly] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);

  const { lines, count, total, add, changeQty, remove } = useCart();

  /* ================= FILTER ================= */

  const visible = useMemo(() => {
    let arr = (items || []).filter((x) => x.status === "ON");
    if (vegOnly) arr = arr.filter((x) => isVeg(x.item_category));
    return arr;
  }, [items, vegOnly]);

  /* ================= GROUP ================= */

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    visible.forEach((it) => {
      const key = it.menu_type || "Others";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    });

    return Array.from(map.entries()).map(([type, items]) => ({
      type,
      items,
    }));
  }, [visible]);

  const getQty = (id: number) =>
    lines.find((l) => l.id === id)?.qty || 0;

  /* ================= UI ================= */

  return (
    <div className="max-w-5xl mx-auto p-4">

      {/* 🔵 FLOATING CART (MOBILE) */}
      {count > 0 && (
  <div className="fixed top-16 right-4 z-50 lg:hidden">
    <button
      onClick={() => setShowMobileCart(true)}
      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg"
    >
      <span className="font-bold">{count}</span>
      <span>₹{total}</span>
      <span className="underline text-sm">View cart</span>
    </button>
  </div>
)}
          <button
            onClick={() => setShowMobileCart(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold"
          >
            {count} ₹{total} View cart
          </button>
        </div>
      )}

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

      <div className="grid lg:grid-cols-3 gap-6">

        {/* MENU */}
        <div className="lg:col-span-2 space-y-4">
          {grouped.map((g) => (
            <div key={g.type}>
              <h2 className="font-semibold mb-2">{g.type}</h2>

              {g.items.map((it) => {
                const qty = getQty(it.id);

                return (
                  <div key={it.id} className="border rounded p-3 mb-2">

                    <div className="flex justify-between">
                      <div className="flex gap-2">
                        {dot(it.item_category)}
                        <div>
                          <div className="font-medium">{it.item_name}</div>
                          <div className="text-xs text-gray-500">
                            {it.start_time} - {it.end_time}
                          </div>
                        </div>
                      </div>

                      <div className="font-bold">
                        {price(it.base_price)}
                      </div>
                    </div>

                    {it.item_description && (
                      <p className="text-xs text-gray-600 mt-1">
                        {it.item_description}
                      </p>
                    )}

                    <div className="mt-2">
                      {qty === 0 ? (
                        <button
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                          onClick={() =>
                            add({
                              id: it.id,
                              name: it.item_name,
                              price: Number(it.base_price || 0),
                              qty: 1,
                            })
                          }
                        >
                          + Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => changeQty(it.id, qty - 1)}>
                            -
                          </button>
                          <span>{qty}</span>
                          <button onClick={() => changeQty(it.id, qty + 1)}>
                            +
                          </button>
                          <button
                            className="text-red-500 text-sm"
                            onClick={() => remove(it.id)}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* DESKTOP CART */}
        <div className="hidden lg:block">
          <div className="border rounded p-4 sticky top-20">
            <h3 className="font-bold mb-2">Your Cart</h3>

            {count === 0 ? (
              <p className="text-sm text-gray-500">Cart is empty</p>
            ) : (
              <>
                {lines.map((l) => (
                  <div key={l.id} className="flex justify-between mb-2">
                    <span>{l.name} × {l.qty}</span>
                    <span>₹{l.price * l.qty}</span>
                  </div>
                ))}

                <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>

                <Link
                  href="/checkout"
                  className="block mt-3 bg-green-600 text-white text-center py-2 rounded"
                >
                  Checkout
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE CART OVERLAY */}
      {showMobileCart && (
        <div className="fixed inset-0 bg-black/40 z-[1000] flex justify-center items-center">
          <div className="bg-white w-[90%] max-w-md rounded-xl p-4">
            <div className="flex justify-between mb-3">
              <h3 className="font-bold">Your Cart</h3>
              <button onClick={() => setShowMobileCart(false)}>✕</button>
            </div>

            {lines.map((l) => (
              <div key={l.id} className="flex justify-between mb-2">
                <span>{l.name} × {l.qty}</span>
                <span>₹{l.price * l.qty}</span>
              </div>
            ))}

            <div className="border-t pt-2 mt-2 flex justify-between font-bold">
              <span>Total</span>
              <span>₹{total}</span>
            </div>

            <Link
              href="/checkout"
              className="block mt-3 bg-green-600 text-white text-center py-2 rounded"
            >
              Checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
