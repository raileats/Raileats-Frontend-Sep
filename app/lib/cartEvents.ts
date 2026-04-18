"use client";

/* ================= EVENTS ================= */

export const CART_OPEN_EVENT = "re:open-cart";
export const CART_CLOSE_EVENT = "re:close-cart";

/* ================= TRIGGERS ================= */

export function openCart() {
  if (typeof document !== "undefined") {
    document.dispatchEvent(new Event(CART_OPEN_EVENT));
  }
}

export function closeCart() {
  if (typeof document !== "undefined") {
    document.dispatchEvent(new Event(CART_CLOSE_EVENT));
  }
}

/* ================= LISTENERS ================= */

export function onOpenCart(handler: () => void) {
  if (typeof document === "undefined") return () => {};

  const fn = () => handler();
  document.addEventListener(CART_OPEN_EVENT, fn);

  return () => {
    document.removeEventListener(CART_OPEN_EVENT, fn);
  };
}

export function onCloseCart(handler: () => void) {
  if (typeof document === "undefined") return () => {};

  const fn = () => handler();
  document.addEventListener(CART_CLOSE_EVENT, fn);

  return () => {
    document.removeEventListener(CART_CLOSE_EVENT, fn);
  };
}
