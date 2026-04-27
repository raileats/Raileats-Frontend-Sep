"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";

/* ================= TYPES ================= */

export type CartLine = {
  id: number;
  name: string;
  qty: number;
  price: number;

  restro_code?: string;
  restro_name?: string;
  station_code?: string;
  station_name?: string;
};

type CartMap = Record<number, CartLine>;

export type CartContextValue = {
  cart: CartMap;
  items: CartLine[];
  count: number;
  total: number;

  add: (line: CartLine) => void;
  changeQty: (id: number, qty: number) => void;
  increaseQty: (id: number) => void;
  decreaseQty: (id: number) => void;
  remove: (id: number) => void;
  clearCart: () => void;
};

/* ================= CONTEXT ================= */

const CartCtx = createContext<CartContextValue | null>(null);

/* ================= PROVIDER ================= */

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartMap>({});

  /* ✅ LOAD */
  useEffect(() => {
    const saved = localStorage.getItem("cart");
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch {}
    }
  }, []);

  /* ✅ SAVE */
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  /* 🔥 LISTEN LOGOUT EVENT (MAIN FIX) */
  useEffect(() => {
    const handleLogout = () => {
      setCart({});
      localStorage.removeItem("cart");
    };

    window.addEventListener("raileats:logout", handleLogout);

    return () => {
      window.removeEventListener("raileats:logout", handleLogout);
    };
  }, []);

  /* ================= ADD ================= */

  const add = (line: CartLine) => {
    if (!line || !line.id) return;

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

  const changeQty = (id: number, qty: number) => {
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

  /* ================= INCREASE / DECREASE ================= */

  const increaseQty = (id: number) => {
    setCart((c) => {
      const row = c[id];
      if (!row) return c;

      return {
        ...c,
        [id]: { ...row, qty: row.qty + 1 },
      };
    });
  };

  const decreaseQty = (id: number) => {
    setCart((c) => {
      const row = c[id];
      if (!row) return c;

      if (row.qty <= 1) {
        const { [id]: _, ...rest } = c;
        return rest;
      }

      return {
        ...c,
        [id]: { ...row, qty: row.qty - 1 },
      };
    });
  };

  /* ================= REMOVE ================= */

  const remove = (id: number) => {
    setCart((c) => {
      const { [id]: _, ...rest } = c;
      return rest;
    });
  };

  /* ================= CLEAR ================= */

  const clearCart = () => {
    setCart({});
    localStorage.removeItem("cart");
  };

  /* ================= MEMO ================= */

  const value = useMemo<CartContextValue>(() => {
    const items = Object.values(cart);

    const count = items.reduce((a, b) => a + b.qty, 0);
    const total = items.reduce((a, b) => a + b.qty * b.price, 0);

    return {
      cart,
      items,
      count,
      total,
      add,
      changeQty,
      increaseQty,
      decreaseQty,
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
