"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "../../../lib/useCart";

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

type Props = {
  header: { stationCode: string; restroCode: string | number; outletName: string };
  items: MenuItem[];
  offer: { text: string } | null;
};

export default function RestroMenuClient({ header, items, offer }: Props) {
  const [vegOnly, setVegOnly] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false); // mobile drawer

  // 🔗 global cart (context)
  const { lines, count, total, add, changeQty, remove, clearCart } = useCart();

  // navbar cart pill can open this panel/drawer
  useEffect(() => {
    const open = () => setDrawerOpen(true);
    window.addEventListener("re:open-cart", open as EventListener);
    return () => window.removeEventListener("re:open-cart", open as EventListener);
  }, []);

  // lock scroll when drawer open (mobile)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    if (drawerOpen) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const visible = useMemo(() => {
    const arr = (items || []).filter((x) => x.status === "ON");
    return vegOnly ? arr.filter((x) => isVegLike(x.item_category)) : arr;
  }, [items, vegOnly]);

  const grouped = useMemo(() => {
    const byType = new Map<string, MenuItem[]>();
    for (const it of visible) {
      const key = it.menu_type?.trim() || "Others";
      const list = byType.get(key);
      list ? list.push(it) : byType.set(key, [it]);
    }
    byType.forEach((list) => list.sort((a, b) => a.item_name.localeCompare(b.item_name)));

    const out: { type: string; items: MenuItem[] }[] = [];
    const used = new Set<string>();
    for (const tp of ORDER_MENU_TYPES) {
      if (byType.has(tp)) {
        out.push({ type: tp, items: byType.get(tp)! });
        used.add(tp);
      }
    }
    Array.from(byType.entries()).forEach(([k, list]) => {
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

  // ---- Cart Panel (shared UI) ----
  function CartPanel() {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Your Cart</h3>
          <div className="flex items-center gap-2">
            {count > 0 && (
              <button className="rounded border px-2 py-1 text-sm" onClick={clearCart} title="Clear cart">
                Clear
              </button>
            )}
          </div>
        </div>

        {count === 0 ? (
          <p className="text-sm text-gray-600">Cart is empty.</p>
        ) : (
          <>
            <div className="space-y-3 overflow-auto">
              {lines.map((line) => (
                <div key={line.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{line.name}</div>
                    <div className="text-xs text-gray-500">
                      {priceStr(line.price)} × {line.qty}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center border rounded overflow-hidden">
                      <button className="px-2 py-1" onClick={() => changeQty(line.id, line.qty - 1)}>
                        −
                      </button>
                      <span className="px-3 py-1 border-l border-r">{line.qty}</span>
                      <button className="px-2 py-1" onClick={() => changeQty(line.id, line.qty + 1)}>
                        +
                      </button>
                    </div>
                    <div className="w-20 text-right font-medium">{priceStr(line.qty * line.price)}</div>
                    <button className="text-rose-600 text-sm ml-1" onClick={() => remove(line.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t flex items-center justify-between">
              <div className="font-semibold">Subtotal</div>
              <div className="font-semibold">{priceStr(total)}</div>
            </div>

            <Link
              href="/checkout"
              className="mt-3 block w-full rounded bg-green-600 text-white py-2 text-center"
              onClick={() => setDrawerOpen(false)}
            >
              Proceed to Checkout
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {/* page header */}
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{header.outletName} — Menu</h1>
        <p className="mt-1 text-sm text-gray-600">
          Station: {header.stationCode} • Outlet Code: {header.restroCode}
        </p>
      </div>

      {/* filters / offer */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
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

        {offer?.text && (
          <span className="text-sm bg-amber-100 text-amber-800 px-2 py-1 rounded">{offer.text}</span>
        )}
      </div>

      {/* ====== MAIN LAYOUT ====== */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* LEFT: menu (2 cols on desktop) */}
        <div className="md:col-span-2 space-y-8">
          {grouped.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded text-sm text-gray-700">No items available.</div>
          ) : (
            grouped.map((g) => (
              <section key={g.type}>
                <h2 className="text-lg font-semibold mb-3">{g.type}</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {g.items.map((it) => {
                    const qty = getQty(it.id);
                    return (
                      <article key={it.id} className="border rounded p-3 flex gap-3">
                        <div className="pt-0.5">{dot(it.item_category)}</div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-medium leading-snug">{it.item_name}</h3>
                              {it.item_description && (
                                <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">
                                  {it.item_description}
                                </p>
                              )}
                              <p className="mt-1 text-xs text-gray-500">
                                {t(it.start_time)}
                                {it.start_time ? "-" : ""}
                                {t(it.end_time)}
                              </p>
                            </div>
                            <div className="text-right whitespace-nowrap">
                              <div className="font-semibold">{priceStr(it.base_price)}</div>
                            </div>
                          </div>

                          <div className="mt-3">
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
                                <button
                                  type="button"
                                  className="px-3 py-1.5"
                                  onClick={() => changeQty(it.id, qty - 1)}
                                >
                                  −
                                </button>
                                <span className="w-10 text-center border-l border-r py-1.5">{qty}</span>
                                <button
                                  type="button"
                                  className="px-3 py-1.5"
                                  onClick={() => changeQty(it.id, qty + 1)}
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  className="ml-2 text-rose-600 text-sm px-2"
                                  onClick={() => remove(it.id)}
                                >
                                  Remove
                                </button>
                              </div>
                            )}
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

        {/* RIGHT: sticky Cart panel (desktop only) */}
        <aside className="hidden md:block">
          <div className="sticky top-20">
            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <CartPanel />
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile: floating pill to open drawer */}
      {count > 0 && (
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="md:hidden fixed bottom-4 right-4 shadow-lg rounded-full bg-blue-600 text-white px-4 py-2 text-sm"
          aria-label="View Cart"
        >
          View Cart • {count} item{count > 1 ? "s" : ""} • {priceStr(total)}
        </button>
      )}

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-[1000] flex items-end">
          <button
            className="absolute inset-0 bg-black/40"
            aria-label="Close cart"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-10 w-full bg-white rounded-t-2xl p-4 max-h-[80vh] overflow-hidden">
            <div className="absolute right-3 top-3">
              <button
                className="rounded border px-2 py-1 text-sm"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <CartPanel />
          </div>
        </div>
      )}
    </>
  );
}
