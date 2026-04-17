"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

/* ================= TYPES ================= */

export type CartLine = {
  id: number;
  name: string;
  qty: number;
  price: number;

  // ✅ NEW (IMPORTANT for order API)
  restro_code?: string;
  restro_name?: string;
  station_code?: string;
  station_name?: string;
};

type CartMap = Record<number, CartLine>;

export type CartContextValue = {
  cart: CartMap;

  items: CartLine[];
  lines: CartLine[];

  count: number;
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

  const add: CartContextValue["add"] = (line) => {
    if (!line || !line.id) return;

    setCart((c) => {
      const existing = c[line.id];

      // ✅ First time add
      if (!existing) {
        return {
          ...c,
          [line.id]: {
            ...line,
            qty: Math.max(1, line.qty || 1),
          },
        };
      }

      // ✅ Increase qty only (keep meta same)
      return {
        ...c,
        [line.id]: {
          ...existing,
          qty: existing.qty + Math.max(1, line.qty || 1),
        },
      };
    });
  };

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
        [id]: {
          ...row,
          qty,
        },
      };
    });
  };

  const remove: CartContextValue["remove"] = (id) => {
    setCart((c) => {
      if (!(id in c)) return c;
      const { [id]: _, ...rest } = c;
      return rest;
    });
  };

  const clearCart = () => setCart({});

  const value = useMemo<CartContextValue>(() => {
    const items = Object.values(cart);

    const count = items.reduce((a, b) => a + b.qty, 0);
    const total = items.reduce((a, b) => a + b.qty * b.price, 0);

    return {
      cart,
      items,
      lines: items,
      count,
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
