// app/lib/cart.ts

export type CartItem = {
  item_code: string;
  item_name: string;
  selling_price: number;
  quantity: number;
};

export type Cart = {
  items: CartItem[];
};

/* ================= GET CART ================= */

export function getCart(): Cart {
  if (typeof window === "undefined") {
    return { items: [] };
  }

  try {
    const raw = localStorage.getItem("raileats_cart");
    if (!raw) return { items: [] };

    return JSON.parse(raw);
  } catch {
    return { items: [] };
  }
}

/* ================= SAVE CART ================= */

function saveCart(cart: Cart) {
  localStorage.setItem("raileats_cart", JSON.stringify(cart));
}

/* ================= ADD ITEM ================= */

export function addToCart(item: CartItem) {
  const cart = getCart();

  const existing = cart.items.find(
    i => i.item_code === item.item_code
  );

  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.items.push(item);
  }

  saveCart(cart);
}

/* ================= REMOVE ITEM ================= */

export function removeFromCart(item_code: string) {
  const cart = getCart();
  cart.items = cart.items.filter(i => i.item_code !== item_code);
  saveCart(cart);
}

/* ================= CLEAR CART ================= */

export function clearCart() {
  saveCart({ items: [] });
}
