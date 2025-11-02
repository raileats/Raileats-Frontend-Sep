// app/components/Providers.tsx
"use client";

import React from "react";
import { CartProvider } from "../lib/useCart";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
