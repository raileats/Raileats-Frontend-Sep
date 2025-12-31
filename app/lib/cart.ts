export function getCart() {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("cart");
  return raw ? JSON.parse(raw) : null;
}

export function saveCart(cart: any) {
  sessionStorage.setItem("cart", JSON.stringify(cart));
}

export function clearCart() {
  sessionStorage.removeItem("cart");
}
