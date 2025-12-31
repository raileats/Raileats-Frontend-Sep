/* ================= TYPES ================= */

export type CartItem = {
  item_code: string;
  item_name: string;
  selling_price: number;
  qty: number; // ✅ REQUIRED (THIS WAS MISSING)
};

export type Cart = {
  restroCode?: number;
  restroName?: string;
  station?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  items: CartItem[];
};

/* ================= STORAGE KEY ================= */

const CART_KEY = "raileats_cart";

/* ================= HELPERS ================= */

export function getCart(): Cart | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCart(cart: Cart) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function clearCart() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_KEY);
}

/* ================= ADD ITEM ================= */

export function addToCart(
  meta: Omit<Cart, "items">,
  item: Omit<CartItem, "qty">
) {
  const cart = getCart() || { ...meta, items: [] };

  const existing = cart.items.find(
    i => i.item_code === item.item_code
  );

  if (existing) {
    existing.qty += 1;
  } else {
    cart.items.push({ ...item, qty: 1 });
  }

  saveCart(cart);
  return cart;
}
