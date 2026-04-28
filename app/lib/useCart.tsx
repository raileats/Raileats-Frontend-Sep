"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";

export type CartLine = {
  id: number;
  name: string;
  qty: number;
  price: number;
};

type CartMap = Record<number, CartLine>;

type CartContextValue = {
  cart: CartMap;
  items: CartLine[];
  count: number;
  total: number;

  add: (line: CartLine) => void;
  increaseQty: (id: number) => void;
  decreaseQty: (id: number) => void;
  remove: (id: number) => void;
  clearCart: () => void;
};

const CartCtx = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartMap>({});

  /* LOAD */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cart");
      if (saved) setCart(JSON.parse(saved));
    } catch {}
  }, []);

  /* SAVE */
  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(cart));
    } catch {}
  }, [cart]);

  /* 🔥 LOGOUT LISTENER (CRITICAL FIX) */
  useEffect(() => {
    const handleLogout = () => {
      setCart({});
    };

    window.addEventListener("raileats:logout", handleLogout);
    return () =>
      window.removeEventListener("raileats:logout", handleLogout);
  }, []);

  const add = (line: CartLine) => {
    setCart((c) => {
      const existing = c[line.id];
      if (!existing) {
        return {
          ...c,
          [line.id]: { ...line, qty: 1 },
        };
      }
      return {
        ...c,
        [line.id]: { ...existing, qty: existing.qty + 1 },
      };
    });
  };

  const increaseQty = (id: number) => {
    setCart((c) => ({
      ...c,
      [id]: { ...c[id], qty: c[id].qty + 1 },
    }));
  };

  const decreaseQty = (id: number) => {
    setCart((c) => {
      const item = c[id];
      if (!item) return c;

      if (item.qty <= 1) {
        const { [id]: _, ...rest } = c;
        return rest;
      }

      return {
        ...c,
        [id]: { ...item, qty: item.qty - 1 },
      };
    });
  };

  const remove = (id: number) => {
    setCart((c) => {
      const { [id]: _, ...rest } = c;
      return rest;
    });
  };

  const clearCart = () => {
    setCart({});
  };

  const value = useMemo(() => {
    const items = Object.values(cart);
    const count = items.reduce((a, b) => a + b.qty, 0);
    const total = items.reduce((a, b) => a + b.qty * b.price, 0);

    return {
      cart,
      items,
      count,
      total,
      add,
      increaseQty,
      decreaseQty,
      remove,
      clearCart,
    };
  }, [cart]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
