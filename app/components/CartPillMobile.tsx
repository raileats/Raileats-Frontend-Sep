"use client";

import React, { useEffect, useState } from "react";
import { useCart } from "../lib/useCart";
import { openCart, onOpenCart, onCloseCart } from "../lib/cartEvents";

export default function CartPillMobile({ minOrder = 0 }: any) {
  const { count, total, clearCart } = useCart();

  const safeCount = Number(count || 0);
  const safeTotal = Number(total || 0);
  const safeMinOrder = Number(minOrder || 0);

  const isBlocked = safeMinOrder > 0 && safeTotal < safeMinOrder;
  const remaining = Math.max(safeMinOrder - safeTotal, 0);

  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const removeOpen = onOpenCart(() => {
      setCartOpen(true);
    });

    const removeClose = onCloseCart(() => {
      setCartOpen(false);
    });

    return () => {
      removeOpen();
      removeClose();
    };
  }, []);

  if (!safeCount || safeCount === 0) return null;
  if (cartOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
        transform: "translateX(-50%)",
        zIndex: 9999,
        width: "calc(100% - 28px)",
        maxWidth: 430,
        boxSizing: "border-box",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          minHeight: 58,
          borderRadius: 18,
          background: "#16a34a",
          color: "#fff",
          boxShadow: "0 14px 34px rgba(22, 163, 74, 0.35)",
          border: "1px solid rgba(255,255,255,0.2)",
          padding: "10px 12px",
          display: "grid",
          gridTemplateColumns: "minmax(74px, 1fr) auto 40px",
          alignItems: "center",
          gap: 10,
          pointerEvents: "auto",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              lineHeight: 1.1,
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
          >
            {safeCount} Item{safeCount > 1 ? "s" : ""}
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 14,
              lineHeight: 1,
              fontWeight: 800,
              opacity: 0.95,
              whiteSpace: "nowrap",
            }}
          >
            Rs {safeTotal.toFixed(0)}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isBlocked) {
              alert(`Minimum order Rs ${safeMinOrder} complete karo`);
              return;
            }

            openCart();
          }}
          style={{
            minWidth: 112,
            height: 42,
            border: 0,
            borderRadius: 14,
            background: isBlocked ? "rgba(255,255,255,0.55)" : "#fff",
            color: isBlocked ? "rgba(21,128,61,0.72)" : "#15803d",
            fontSize: 14,
            fontWeight: 950,
            cursor: isBlocked ? "not-allowed" : "pointer",
            boxShadow: "0 4px 12px rgba(15,23,42,0.12)",
          }}
        >
          View Cart
        </button>

        <button
          type="button"
          aria-label="Clear cart"
          onClick={(e) => {
            e.stopPropagation();
            clearCart();
          }}
          style={{
            width: 40,
            height: 40,
            border: 0,
            borderRadius: 999,
            background: "#ef4444",
            color: "#fff",
            fontSize: 22,
            lineHeight: 1,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 6px 14px rgba(239,68,68,0.32)",
          }}
        >
          ×
        </button>
      </div>

      {isBlocked ? (
        <div
          style={{
            margin: "6px auto 0",
            width: "fit-content",
            maxWidth: "92%",
            borderRadius: 999,
            background: "#fff",
            border: "1px solid #fecaca",
            color: "#dc2626",
            fontSize: 12,
            lineHeight: 1.2,
            fontWeight: 800,
            textAlign: "center",
            padding: "6px 10px",
            boxShadow: "0 8px 18px rgba(15,23,42,0.08)",
            pointerEvents: "auto",
          }}
        >
          Add Rs {remaining.toFixed(0)} more for minimum order
        </div>
      ) : null}
    </div>
  );
}
