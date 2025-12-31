"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCart, clearCart } from "@/lib/cart";

/* ================= TYPES ================= */

type CartItem = {
  item_code: string;
  item_name: string;
  selling_price: number;
  qty: number;
};

type Cart = {
  restroCode: number;
  restroName: string;
  stationCode: string;
  stationName: string;
  arrivalDate: string;
  arrivalTime: string;
  items: CartItem[];
};

/* ================= PAGE ================= */

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);

  /* ================= LOAD CART ================= */

  useEffect(() => {
    const c = getCart() as Cart | null;

    if (!c || !Array.isArray(c.items) || c.items.length === 0) {
      router.replace("/search");
      return;
    }

    setCart(c);
  }, [router]);

  if (!cart) {
    return <div className="p-4">Loading checkout…</div>;
  }

  /* ================= TOTAL ================= */

  const total = cart.items.reduce(
    (sum, item) => sum + item.selling_price * item.qty,
    0
  );

  /* ================= PLACE ORDER ================= */

  async function placeOrder() {
    try {
      setLoading(true);

      const res = await fetch("/api/order/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pnr: "",
          trainNumber: "",
          trainName: "",
          restroCode: cart.restroCode,
          restroName: cart.restroName,
          stationCode: cart.stationCode,
          stationName: cart.stationName,
          arrivalDate: cart.arrivalDate,
          arrivalTime: cart.arrivalTime,
          customerName: "Guest",
          customerMobile: "9999999999",
          items: cart.items,
        }),
      });

      const data = await res.json();

      if (!data || !data.ok) {
        alert("Order failed. Please try again.");
        return;
      }

      clearCart();

      router.push(
        `/order-success?orderId=${data.orderId}&amount=${data.totalAmount}`
      );
    } catch (err) {
      console.error("PLACE ORDER ERROR:", err);
      alert("Server error while placing order");
    } finally {
      setLoading(false);
    }
  }

  /* ================= UI ================= */

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold">Order Summary</h1>

      {/* Station / Train Info */}
      <div className="border rounded p-3 bg-gray-50 text-sm space-y-1">
        <div><b>Restaurant:</b> {cart.restroName}</div>
        <div><b>Station:</b> {cart.stationName}</div>
        <div><b>Date:</b> {cart.arrivalDate}</div>
        <div><b>Arrival Time:</b> {cart.arrivalTime}</div>
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
        onClick={placeOrder}
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 rounded disabled:opacity-50"
      >
        {loading ? "Placing Order…" : "Place Order"}
      </button>
    </div>
  );
}
