"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type CartLine = {
  id: number;
  name: string;
  qty: number;
  price: number; // base price per unit
};

type CartMap = Record<number, CartLine>;

export type CartContextValue = {
  /** internal map */
  cart: CartMap;

  /** list views (aliases; same data) */
  items: CartLine[];  // preferred
  lines: CartLine[];  // backward compatibility

  /** derived */
  count: number;
  total: number;

  /** actions */
  add: (line: CartLine) => void;
  changeQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clearCart: () => void;
};

const CartCtx = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartMap>({});

  const add: CartContextValue["add"] = (line) => {
    if (!line || !line.id) return;
    setCart((c) => {
      const existing = c[line.id];
      if (!existing) return { ...c, [line.id]: { ...line, qty: Math.max(1, line.qty || 1) } };
      return { ...c, [line.id]: { ...existing, qty: existing.qty + Math.max(1, line.qty || 1) } };
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
      return { ...c, [id]: { ...row, qty } };
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
      lines: items, // alias for backward compatibility
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

export function useCart(): CartContextValue {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
