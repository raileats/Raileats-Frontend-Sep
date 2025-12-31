"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCart } from "@/lib/cart";

/* ✅ IMPORTANT
   Cart & CartItem TYPES MUST COME FROM lib/cart
*/
import type { Cart } from "@/lib/cart";

/* ================= PAGE ================= */

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);

  useEffect(() => {
    const c = getCart();

    if (!c || !c.items || c.items.length === 0) {
      router.push("/search");
      return;
    }

    // ✅ SAME TYPE → no TS conflict
    setCart(c);
  }, [router]);

  if (!cart) {
    return <div className="p-4">Loading checkout…</div>;
  }

  const total = cart.items.reduce(
    (sum, i) => sum + i.selling_price * i.qty,
    0
  );

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold">Order Summary</h1>

      {/* Info */}
      <div className="border rounded p-3 bg-gray-50 text-sm space-y-1">
        <div><b>Restaurant:</b> {cart.restroName ?? "-"}</div>
        <div><b>Station:</b> {cart.station ?? "-"}</div>
        <div><b>Date:</b> {cart.arrivalDate ?? "-"}</div>
        <div><b>Arrival:</b> {cart.arrivalTime ?? "-"}</div>
      </div>

      {/* Items */}
      <div className="border rounded">
        {cart.items.map(item => (
          <div
            key={item.item_code}
            className="flex justify-between p-3 border-b last:border-b-0"
          >
            <div>
              <div className="font-medium">{item.item_name}</div>
              <div className="text-sm text-gray-500">
                Qty: {item.qty}
              </div>
            </div>

            <div className="font-semibold">
              ₹{item.selling_price * item.qty}
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex justify-between text-lg font-bold">
        <span>Total</span>
        <span>₹{total}</span>
      </div>

      {/* Action */}
      <button
        className="w-full bg-green-600 text-white py-2 rounded"
        onClick={() => router.push("/checkout/confirm")}
      >
        Place Order
      </button>
    </div>
  );
}
