"use client";

import React, { useEffect } from "react";
import { CartProvider } from "../lib/useCart";
import { useAuth } from "../lib/useAuth";

export default function Providers({ children }: { children: React.ReactNode }) {
  const { loadUser } = useAuth();

  // 🔥 VERY IMPORTANT: load user from localStorage on app start
  useEffect(() => {
    loadUser();
  }, []);

  return <CartProvider>{children}</CartProvider>;
}
