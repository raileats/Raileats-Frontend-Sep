// tiny event bus so any component can open the cart
export const CART_OPEN_EVENT = "re:open-cart";

export function openCart() {
  if (typeof document !== "undefined") {
    document.dispatchEvent(new Event(CART_OPEN_EVENT));
  }
}

export function onOpenCart(handler: () => void) {
  if (typeof document === "undefined") return () => {};
  const fn = () => handler();
  document.addEventListener(CART_OPEN_EVENT, fn);
  return () => document.removeEventListener(CART_OPEN_EVENT, fn);
}
