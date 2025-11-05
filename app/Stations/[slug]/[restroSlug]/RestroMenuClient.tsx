"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "../../../lib/useCart"; // adjust path if needed

// ---- Types ----
type MenuItem = {
  id: number;
  restro_code: string | number;
  item_code?: string | null;
  item_name: string;
  item_description?: string | null;
  item_category?: string | null; // Veg | Jain | Non-Veg
  item_cuisine?: string | null;
  menu_type?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  base_price?: number | null;
  gst_percent?: number | null;
  selling_price?: number | null;
  status?: "ON" | "OFF" | "DELETED" | null;
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
  "Thalis",
  "Combos",
  "Breakfast",
  "Rice And Biryani",
  "Roti Paratha",
  "Pizza and Sandwiches",
  "Fast Food",
  "Burger",
  "Starters and Snacks",
  "Sweets",
  "Beverages",
  "Restro Specials",
  "Bakery",
];

const isVegLike = (cat?: string | null) => {
  const c = String(cat || "").toLowerCase();
  return c === "veg" || c === "jain";
};
const isNonVeg = (cat?: string | null) => String(cat || "").toLowerCase() === "non-veg";

const dot = (cat?: string | null) => {
  if (isVegLike(cat)) return <span className="inline-block w-3 h-3 rounded-full bg-green-600" title="Veg" />;
  if (isNonVeg(cat)) return <span className="inline-block w-3 h-3 rounded-full bg-red-600" title="Non-Veg" />;
  return <span className="inline-block w-3 h-3 rounded-full bg-gray-400" title="Unspecified" />;
};

const t = (s?: string | null) => (s ? s.slice(0, 5) : "");
const priceStr = (n?: number | null) =>
  typeof n === "number" ? `₹${Number(n).toFixed(2).replace(/\.00$/, "")}` : "—";

export default function RestroMenuClient({ header, items, offer }: Props) {
  const [vegOnly, setVegOnly] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);

  const { lines, count, total, add, changeQty, remove, clearCart } = useCart();

  const visible = useMemo(() => {
    const arr = (items || []).filter((x) => x.status === "ON");
    return vegOnly ? arr.filter((x) => isVegLike(x.item_category)) : arr;
  }, [items, vegOnly]);

  const grouped = useMemo(() => {
    const by = new Map<string, MenuItem[]>();
    for (const it of visible) {
      const k = it.menu_type?.trim() || "Others";
      const list = by.get(k);
      list ? list.push(it) : by.set(k, [it]);
    }
    by.forEach((l) => l.sort((a, b) => a.item_name.localeCompare(b.item_name)));

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
    <>
      {/* Scoped CSS tweaks for spacing + pill placement */}
      <style jsx>{`
        /* header row: tighten gap between navbar & header */
        .header-row { margin-top: 6px; margin-bottom: 8px; display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
        .title-block { min-width:0; }
        .title { font-size: 1.5rem; line-height:1.05; margin:0; font-weight:700; }
        .subtitle { margin-top:6px; color:#6b7280; font-size:0.95rem; }

        /* place veg toggle & cart pill inline on right */
        .right-controls { display:flex; gap:10px; align-items:center; flex-shrink:0; }

        /* mobile pill position: just below navbar, right */
        .mobile-pill { position: absolute; right: 12px; top: 58px; z-index:40; }

        /* group/item spacing reduced */
        .group { margin-bottom: 0.9rem; }
        .item { margin-bottom: 0.5rem; }

        /* item top: name + time left, price right */
        .item-top { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .item-left { min-width:0; display:flex; gap:10px; align-items:center; }
        .item-name { font-weight:600; white-space:normal; }
        .item-time { color:#6b7280; font-size:0.86rem; flex-shrink:0; }
        .item-price { font-weight:700; white-space:nowrap; }

        @media (min-width: 1024px) {
          .mobile-pill { display:none; } /* desktop uses sticky cart */
        }
        @media (max-width: 640px) {
          .title { font-size:1.4rem; } /* slightly smaller on small phones */
          .subtitle { font-size:0.9rem; }
        }
      `}</style>

      {/* HEADER ROW */}
      <div className="header-row">
        <div className="title-block">
          {/* only restaurant name here (no "— Menu") */}
          <h1 className="title">{header.outletName}</h1>

          {/* station code + optional station name; DO NOT show restroCode */}
          <div className="subtitle">
            {header.stationCode}
            {header.stationName ? ` • ${header.stationName}` : ""}
          </div>
        </div>

        {/* right side controls: Veg toggle + mobile cart pill */}
        <div className="right-controls">
          {/* Veg only toggle (small) */}
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={vegOnly}
              onChange={(e) => setVegOnly(e.target.checked)}
            />
            <span className="w-10 h-6 bg-gray-300 rounded-full relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-4 peer-checked:bg-green-500" />
            <span className="text-sm">Veg only</span>
          </label>

          {/* mobile cart pill (visible only on small screens) */}
          {count > 0 && (
            <div className="mobile-pill lg:hidden">
              <button
                onClick={() => setShowMobileCart(true)}
                className="inline-flex items-center rounded-full bg-blue-600 text-white px-3 py-1.5 text-sm shadow whitespace-nowrap"
                aria-label="View cart"
              >
                <span className="font-semibold mr-1">{count}</span>
                <span className="opacity-90 mr-2">{priceStr(total)}</span>
                <span className="underline">View cart</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* small top gap */}
      <div style={{ height: 4 }} />

      {/* groups grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* left menu column */}
        <div className="lg:col-span-2">
          {grouped.length === 0 ? (
            <div className="p-3 bg-gray-50 rounded text-sm text-gray-700">No items available.</div>
          ) : (
            grouped.map((g) => (
              <section key={g.type} className="group">
                <h2 className="text-lg font-semibold mb-2">{g.type}</h2>

                <div>
                  {g.items.map((it) => {
                    const qty = getQty(it.id);
                    return (
                      <article key={it.id} className="border rounded p-3 item">
                        <div className="flex gap-3">
                          <div className="pt-0.5">{dot(it.item_category)}</div>

                          <div className="flex-1">
                            <div className="item-top">
                              <div className="item-left min-w-0">
                                <div className="item-name">{it.item_name}</div>
                                <div className="item-time ml-2">{t(it.start_time)}{it.start_time ? "-" : ""}{t(it.end_time)}</div>
                              </div>

                              <div className="item-price">{priceStr(it.base_price)}</div>
                            </div>

                            {it.item_description && (
                              <p className="mt-1 text-xs text-gray-600">{it.item_description}</p>
                            )}

                            <div className="mt-2">
                              {qty === 0 ? (
                                <button
                                  type="button"
                                  className="px-3 py-1.5 rounded bg-green-600 text-white text-sm"
                                  onClick={() => addOne(it)}
                                >
                                  + Add
                                </button>
                              ) : (
                                <div className="inline-flex items-center border rounded overflow-hidden">
                                  <button type="button" className="px-3 py-1.5" onClick={() => changeQty(it.id, qty - 1)}>−</button>
                                  <span className="w-10 text-center border-l border-r py-1.5">{qty}</span>
                                  <button type="button" className="px-3 py-1.5" onClick={() => changeQty(it.id, qty + 1)}>+</button>
                                  <button type="button" className="ml-2 text-rose-600 text-sm px-2" onClick={() => remove(it.id)}>Remove</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        {/* desktop sticky cart */}
        <aside className="lg:col-span-1 hidden lg:block">
          <div className="lg:sticky lg:top-24 border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold">Your Cart</h3>
              {count > 0 && (
                <button className="text-sm px-2 py-1 rounded border" onClick={clearCart}>
                  Clear
                </button>
              )}
            </div>

            {count === 0 ? (
              <p className="text-sm text-gray-600">Cart is empty.</p>
            ) : (
              <div className="space-y-3">
                {lines.map((line) => (
                  <div key={line.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{line.name}</div>
                      <div className="text-xs text-gray-500">{priceStr(line.price)} × {line.qty}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center border rounded overflow-hidden">
                        <button className="px-2 py-1" onClick={() => changeQty(line.id, line.qty - 1)}>−</button>
                        <span className="px-3 py-1 border-l border-r">{line.qty}</span>
                        <button className="px-2 py-1" onClick={() => changeQty(line.id, line.qty + 1)}>+</button>
                      </div>
                      <button className="text-rose-600 text-sm ml-1" onClick={() => remove(line.id)}>Remove</button>
                    </div>
                  </div>
                ))}

                <div className="pt-3 border-t flex items-center justify-between">
                  <div className="font-semibold">Subtotal</div>
                  <div className="font-semibold">{priceStr(total)}</div>
                </div>

                <Link href="/checkout" className="block w-full mt-1 rounded bg-green-600 text-white py-2 text-center">
                  Proceed to Checkout
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile cart overlay (unchanged) */}
      {showMobileCart && (
        <div className="lg:hidden fixed inset-0 z-[1000]">
          <button className="absolute inset-0 bg-black/40" onClick={() => setShowMobileCart(false)} aria-label="Close cart" />
          <div className="absolute left-1/2 -translate-x-1/2 top-[5vh] h-[90vh] w-[92vw] rounded-2xl bg-white shadow-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold">Your Cart</h3>
              <div className="flex items-center gap-2">
                {count > 0 && <button className="text-sm px-2 py-1 rounded border" onClick={clearCart}>Clear</button>}
                <button className="rounded border px-2 py-1" onClick={() => setShowMobileCart(false)} aria-label="Close">✕</button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {count === 0 ? (<p className="text-sm text-gray-600">Cart is empty.</p>) : (
                <div className="space-y-3">
                  {lines.map((line) => (
                    <div key={line.id} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{line.name}</div>
                        <div className="text-xs text-gray-500">{priceStr(line.price)} × {line.qty}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center border rounded overflow-hidden">
                          <button className="px-2 py-1" onClick={() => changeQty(line.id, line.qty - 1)}>−</button>
                          <span className="px-3 py-1 border-l border-r">{line.qty}</span>
                          <button className="px-2 py-1" onClick={() => changeQty(line.id, line.qty + 1)}>+</button>
                        </div>
                        <button className="text-rose-600 text-sm ml-1" onClick={() => remove(line.id)}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t mt-3">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">Subtotal</div>
                <div className="font-semibold">{priceStr(total)}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setShowMobileCart(false)} className="rounded border py-2">Add More Items</button>
                <Link href="/checkout" className="rounded bg-green-600 text-white py-2 text-center" onClick={() => setShowMobileCart(false)}>Checkout</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
