// app/Stations/[slug]/[restroSlug]/RestroMenuClient.tsx
"use client";

import React, { useMemo, useState } from "react";

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
  header: { stationCode: string; restroCode: string; outletName: string };
  items: MenuItem[];
  offer: { text: string } | null;
};

type CartLine = {
  id: number;
  name: string;
  qty: number;
  price: number; // base_price
};

export default function RestroMenuClient({ header, items, offer }: Props) {
  const [vegOnly, setVegOnly] = useState(false);
  const [cart, setCart] = useState<Record<number, CartLine>>({}); // key by item.id
  const [showCart, setShowCart] = useState(false);

  // filter ON (already ON from server) + veg-only
  const visible = useMemo(() => {
    const arr = (items || []).filter((x) => x.status === "ON");
    if (!vegOnly) return arr;
    return arr.filter((x) => isVegLike(x.item_category));
  }, [items, vegOnly]);

  // group by menu_type with preferred ordering
  const grouped = useMemo(() => {
    const byType = new Map<string, MenuItem[]>();
    for (const it of visible) {
      const key = it.menu_type?.trim() || "Others";
      if (!byType.has(key)) byType.set(key, []);
      byType.get(key)!.push(it);
    }
    // sort each group by item_name
    for (const [, list] of byType) {
      list.sort((a, b) => a.item_name.localeCompare(b.item_name));
    }
    // order groups
    const out: { type: string; items: MenuItem[] }[] = [];
    const used = new Set<string>();
    for (const t of ORDER_MENU_TYPES) {
      if (byType.has(t)) {
        out.push({ type: t, items: byType.get(t)! });
        used.add(t);
      }
    }
    // rest
    for (const [k, list] of byType) {
      if (!used.has(k)) out.push({ type: k, items: list });
    }
    return out;
  }, [visible]);

  const summary = useMemo(() => {
    const lines = Object.values(cart);
    const count = lines.reduce((a, b) => a + b.qty, 0);
    const total = lines.reduce((a, b) => a + b.qty * b.price, 0);
    return { count, total };
  }, [cart]);

  function addToCart(it: MenuItem) {
    const price = Number(it.base_price || 0);
    if (!price) return;
    setCart((c) => {
      const line = c[it.id];
      if (!line) return { ...c, [it.id]: { id: it.id, name: it.item_name, qty: 1, price } };
      return { ...c, [it.id]: { ...line, qty: line.qty + 1 } };
    });
  }
  function changeQty(id: number, qty: number) {
    setCart((c) => {
      const line = c[id];
      if (!line) return c;
      if (qty <= 0) {
        const { [id]: _, ...rest } = c;
        return rest;
      }
      return { ...c, [id]: { ...line, qty } };
    });
  }

  return (
    <>
      {/* header */}
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
          {header.outletName} — Menu
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Station: {header.stationCode} • Outlet Code: {header.restroCode}
        </p>
      </div>

      {/* top controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Veg-only toggle */}
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

        {/* Offer pill (optional) */}
        {offer?.text && (
          <span className="text-sm bg-amber-100 text-amber-800 px-2 py-1 rounded">
            {offer.text}
          </span>
        )}
      </div>

      {/* groups */}
      <div className="space-y-8">
        {grouped.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded text-sm text-gray-700">
            No items available.
          </div>
        ) : (
          grouped.map((g) => (
            <section key={g.type}>
              <h2 className="text-lg font-semibold mb-3">{g.type}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {g.items.map((it) => {
                  const inCart = cart[it.id];
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
                              {t(it.start_time)}{it.start_time ? "-" : ""}{t(it.end_time)}
                            </p>
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <div className="font-semibold">{priceStr(it.base_price)}</div>
                          </div>
                        </div>

                        {/* add / qty controls */}
                        <div className="mt-3">
                          {!inCart ? (
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded bg-green-600 text-white text-sm"
                              onClick={() => addToCart(it)}
                            >
                              + Add
                            </button>
                          ) : (
                            <div className="inline-flex items-center border rounded overflow-hidden">
                              <button
                                type="button"
                                className="px-3 py-1.5"
                                onClick={() => changeQty(it.id, inCart.qty - 1)}
                              >
                                −
                              </button>
                              <input
                                className="w-10 text-center border-l border-r py-1.5"
                                value={inCart.qty}
                                onChange={(e) =>
                                  changeQty(it.id, Math.max(0, parseInt(e.target.value || "0", 10) || 0))
                                }
                              />
                              <button
                                type="button"
                                className="px-3 py-1.5"
                                onClick={() => changeQty(it.id, inCart.qty + 1)}
                              >
                                +
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

      {/* floating mini cart chip */}
      {summary.count > 0 && (
        <button
          type="button"
          onClick={() => setShowCart(true)}
          className="fixed bottom-4 right-4 shadow-lg rounded-full bg-blue-600 text-white px-4 py-2 text-sm"
          aria-label="View Cart"
        >
          View Cart • {summary.count} item{summary.count > 1 ? "s" : ""} • {priceStr(summary.total)}
        </button>
      )}

      {/* simple cart drawer */}
      {showCart && (
        <div
          className="fixed inset-0 z-[1000] flex items-end sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
        >
          <button
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCart(false)}
            aria-label="Close cart"
          />
          <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Your Cart</h3>
              <button className="rounded border px-2 py-1" onClick={() => setShowCart(false)}>
                ✕
              </button>
            </div>
            {summary.count === 0 ? (
              <p className="text-sm text-gray-600">Cart is empty.</p>
            ) : (
              <div className="space-y-3">
                {Object.values(cart).map((line) => (
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
                      <div className="w-20 text-right font-medium">
                        {priceStr(line.qty * line.price)}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t flex items-center justify-between">
                  <div className="font-semibold">Subtotal</div>
                  <div className="font-semibold">{priceStr(summary.total)}</div>
                </div>
                <button
                  type="button"
                  className="w-full mt-1 rounded bg-green-600 text-white py-2"
                  onClick={() => alert("Proceed to checkout • coming soon")}
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
