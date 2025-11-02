"use client";

import { useEffect, useState } from "react";

export type CartLine = {
  id: number;
  name: string;
  qty: number;
  price: number;
};

type CartState = Record<number, CartLine>;

const LS_KEY = "raileats_cart";

function loadCart(): CartState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCart(cart: CartState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cart));
  } catch {}
}

export function useCart() {
  const [cart, setCart] = useState<CartState>({});

  // Load on mount
  useEffect(() => {
    setCart(loadCart());
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      saveCart(cart);
    }
  }, [cart]);

  function add(id: number, name: string, price: number) {
    setCart((c) => {
      const line = c[id];
      if (!line) return { ...c, [id]: { id, name, qty: 1, price } };
      return { ...c, [id]: { ...line, qty: line.qty + 1 } };
    });
  }

  function change(id: number, qty: number) {
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

  function clear() {
    setCart({});
  }

  const lines = Object.values(cart);
  const count = lines.reduce((a, b) => a + b.qty, 0);
  const total = lines.reduce((a, b) => a + b.qty * b.price, 0);

  return { cart, add, change, clear, count, total };
}
