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

export type JourneyDetails = {
  trainNumber?: string;
  trainName?: string;
  stationName?: string;
  stationCode?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  vendorName?: string;
};

export type CartContextValue = {
  cart: CartMap;
  items: CartLine[];
  count: number;
  total: number;

  journey: JourneyDetails;
  setJourney: (data: JourneyDetails) => void;

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

export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  const [cart, setCart] = useState<CartMap>({});

  const [journey, setJourneyState] =
    useState<JourneyDetails>({});

  /* ================= LOAD ================= */

  useEffect(() => {

    const saved = localStorage.getItem("cart");

    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch {}
    }

    const savedJourney =
      localStorage.getItem("journey");

    if (savedJourney) {
      try {
        setJourneyState(JSON.parse(savedJourney));
      } catch {}
    }

  }, []);

  /* ================= SAVE ================= */

  useEffect(() => {

    localStorage.setItem(
      "cart",
      JSON.stringify(cart)
    );

    localStorage.setItem(
      "journey",
      JSON.stringify(journey)
    );

  }, [cart, journey]);

  /* ================= LOGOUT CLEAR ================= */

  useEffect(() => {

    const handleLogout = () => {

      setCart({});
      setJourneyState({});

      localStorage.removeItem("cart");
      localStorage.removeItem("journey");
    };

    window.addEventListener(
      "raileats:logout",
      handleLogout
    );

    return () => {
      window.removeEventListener(
        "raileats:logout",
        handleLogout
      );
    };

  }, []);

  /* ================= JOURNEY ================= */

  const setJourney = (data: JourneyDetails) => {
    setJourneyState(data);
  };

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
          qty:
            existing.qty +
            Math.max(1, line.qty || 1),
        },
      };

    });

  };

  /* ================= CHANGE QTY ================= */

  const changeQty = (
    id: number,
    qty: number
  ) => {

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

  /* ================= INCREASE ================= */

  const increaseQty = (id: number) => {

    setCart((c) => {

      const row = c[id];

      if (!row) return c;

      return {
        ...c,
        [id]: {
          ...row,
          qty: row.qty + 1,
        },
      };

    });

  };

  /* ================= DECREASE ================= */

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
        [id]: {
          ...row,
          qty: row.qty - 1,
        },
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
    setJourneyState({});

    localStorage.removeItem("cart");
    localStorage.removeItem("journey");

  };

  /* ================= MEMO ================= */

  const value = useMemo<CartContextValue>(() => {

    const items = Object.values(cart);

    const count = items.reduce(
      (a, b) => a + b.qty,
      0
    );

    const total = items.reduce(
      (a, b) => a + b.qty * b.price,
      0
    );

    return {
      cart,
      items,
      count,
      total,

      journey,
      setJourney,

      add,
      changeQty,
      increaseQty,
      decreaseQty,
      remove,
      clearCart,
    };

  }, [cart, journey]);

  return (
    <CartCtx.Provider value={value}>
      {children}
    </CartCtx.Provider>
  );
}

/* ================= HOOK ================= */

export function useCart(): CartContextValue {

  const ctx = useContext(CartCtx);

  if (!ctx) {
    throw new Error(
      "useCart must be used within CartProvider"
    );
  }

  return ctx;
}
