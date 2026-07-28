"use client";

import React, { useEffect } from "react";
import { CartProvider } from "../lib/useCart";
import { useAuth } from "../lib/useAuth";

export default function Providers({ children }: { children: React.ReactNode }) {
  const { loadUser } = useAuth();

  useEffect(() => {
    loadUser();

    const handleAuthChange = () => {
      loadUser();
    };

    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("raileats:logout", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("raileats:logout", handleAuthChange);
    };
  }, []);

  return <CartProvider>{children}</CartProvider>;
}
