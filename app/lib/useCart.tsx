// app/lib/useCart.tsx
"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type CartLine = {
  id: number;
  name: string;
  qty: number;
  price: number; // base price per unit
};

type CartState = Record<number, CartLine>;

type CartContextValue = {
  cart: CartState;
  add: (line: CartLine) => void;
  setQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  count: number;   // total items (sum of qty)
  subtotal: number;
};

const CartCtx = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState>({});

  const value = useMemo<CartContextValue>(() => {
    const lines = Object.values(cart);
    const count = lines.reduce((a, b) => a + b.qty, 0);
    const subtotal = lines.reduce((a, b) => a + b.qty * b.price, 0);

    return {
      cart,
      add: (line) =>
        setCart((c) => {
          const prev = c[line.id];
          if (!prev) return { ...c, [line.id]: { ...line, qty: Math.max(1, line.qty) } };
          return { ...c, [line.id]: { ...prev, qty: prev.qty + Math.max(1, line.qty) } };
        }),
      setQty: (id, qty) =>
        setCart((c) => {
          const cur = c[id];
          if (!cur) return c;
          if (qty <= 0) {
            const { [id]: _, ...rest } = c;
            return rest;
          }
          return { ...c, [id]: { ...cur, qty } };
        }),
      remove: (id) =>
        setCart((c) => {
          const { [id]: _, ...rest } = c;
          return rest;
        }),
      clear: () => setCart({}),
      count,
      subtotal,
    };
  }, [cart]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) {
    throw new Error("useCart must be used within <CartProvider>");
  }
  return ctx;
}

// Keep both named and default exports so existing imports work:
// - import useCart from "../lib/useCart"
// - import { useCart } from "../lib/useCart"
export default useCart;
