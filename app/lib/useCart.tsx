"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

/* ================= TYPES ================= */

export type CartLine = {
  id: number;
  name: string;
  qty: number;
  price: number;

  // ✅ REQUIRED FOR ORDER API
  restro_code: string;
  restro_name?: string;
  station_code?: string;
  station_name?: string;

  // ✅ OPTIONAL (future safe)
  item_code?: string;
};

type CartMap = Record<number, CartLine>;

export type CartContextValue = {
  cart: CartMap;

  items: CartLine[];
  lines: CartLine[];

  count: number;

  // ✅ PRICING BREAKDOWN
  subtotal: number;
  gst: number;
  delivery: number;
  total: number;

  add: (line: CartLine) => void;
  changeQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clearCart: () => void;
};

/* ================= CONTEXT ================= */

const CartCtx = createContext<CartContextValue | null>(null);

/* ================= PROVIDER ================= */

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartMap>({});

  /* ================= ADD ================= */

  const add: CartContextValue["add"] = (line) => {
    // ❌ अगर restro_code नहीं है → reject
    if (!line || !line.id || !line.restro_code) {
      console.error("❌ Missing restro_code in cart item", line);
      return;
    }

    setCart((c) => {
      const existing = c[line.id];

      if (!existing) {
        return {
          ...c,
          [line.id]: {
            ...line,
            qty: Math.max(1, line.qty || 1),
          },
        };
      }

      return {
        ...c,
        [line.id]: {
          ...existing,
          qty: existing.qty + Math.max(1, line.qty || 1),
        },
      };
    });
  };

  /* ================= CHANGE QTY ================= */

  const changeQty: CartContextValue["changeQty"] = (id, qty) => {
    setCart((c) => {
      const row = c[id];
      if (!row) return c;

      if (qty <= 0) {
        const { [id]: _, ...rest } = c;
        return rest;
      }

      return {
        ...c,
        [id]: { ...row, qty },
      };
    });
  };

  /* ================= REMOVE ================= */

  const remove: CartContextValue["remove"] = (id) => {
    setCart((c) => {
      if (!(id in c)) return c;
      const { [id]: _, ...rest } = c;
      return rest;
    });
  };

  /* ================= CLEAR ================= */

  const clearCart = () => setCart({});

  /* ================= CALCULATIONS ================= */

  const value = useMemo<CartContextValue>(() => {
    const items = Object.values(cart);

    const count = items.reduce((a, b) => a + b.qty, 0);

    const subtotal = items.reduce(
      (a, b) => a + b.qty * Number(b.price || 0),
      0
    );

    const gst = Math.round(subtotal * 0.05); // ✅ 5% GST
    const delivery = subtotal > 0 ? 20 : 0; // ✅ flat ₹20
    const total = subtotal + gst + delivery;

    return {
      cart,
      items,
      lines: items,
      count,

      subtotal,
      gst,
      delivery,
      total,

      add,
      changeQty,
      remove,
      clearCart,
    };
  }, [cart]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

/* ================= HOOK ================= */

export function useCart(): CartContextValue {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
