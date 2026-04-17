"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/useCart";

export default function CheckoutPage() {
  const router = useRouter();

  // ✅ FIXED (lines → items)
  const { items, clearCart } = useCart();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");

  /* ================= CALCULATIONS ================= */

  const subtotal = items.reduce(
    (sum, i) => sum + Number(i.price) * Number(i.qty),
    0
  );

  const gst = Math.round(subtotal * 0.05);
  const delivery = subtotal > 0 ? 20 : 0;

  const total = subtotal + gst + delivery;

  /* ================= ORDER ================= */

  const placeOrder = async () => {
    if (!items.length) {
      alert("Cart empty");
      return;
    }

    const firstItem = items[0];

    // ✅ DEBUG (optional)
    console.log("PAYLOAD =>", {
      restroCode: firstItem?.restro_code,
    });

    try {
      const res = await fetch("/api/order/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pnr: "1234567890",
          trainNumber: "11016",
          trainName: "Demo Express",

          // 🔥 MOST IMPORTANT
          restroCode: firstItem?.restro_code,
          restroName: firstItem?.restro_name,

          stationCode: firstItem?.station_code,
          stationName: firstItem?.station_name,

          arrivalDate: "2026-04-18",
          arrivalTime: "12:30",

          paymentMode: "COD",

          customerName: name || "Guest",
          customerMobile: mobile || "",

          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            qty: i.qty,
            selling_price: i.price,
          })),
        }),
      });

      const data = await res.json();

      console.log("API RESPONSE =>", data);

      if (!data.ok) {
        alert("Order failed (Admin API)");
        return;
      }

      clearCart();

      router.push("/order-success");
    } catch (e) {
      console.error(e);
      alert("Server error");
    }
  };

  /* ================= UI ================= */

  return (
    <div className="max-w-md mx-auto p-4">

      <h2 className="text-lg font-bold mb-3">Passenger Details</h2>

      <input
        className="border p-2 w-full mb-2"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        className="border p-2 w-full mb-4"
        placeholder="Mobile"
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
      />

      {/* ORDER SUMMARY */}
      <div className="border p-3 rounded mb-3">
        <h3 className="font-semibold mb-2">Your Order</h3>

        {items.map((i) => (
          <div key={i.id} className="flex justify-between text-sm">
            <span>{i.name} x {i.qty}</span>
            <span>₹{i.price * i.qty}</span>
          </div>
        ))}

        <hr className="my-2" />

        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>₹{subtotal}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span>GST (5%)</span>
          <span>₹{gst}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span>Delivery</span>
          <span>₹{delivery}</span>
        </div>

        <div className="flex justify-between font-bold mt-2">
          <span>Total</span>
          <span>₹{total}</span>
        </div>
      </div>

      <button
        onClick={placeOrder}
        className="w-full bg-green-600 text-white py-2 rounded"
      >
        Place Order
      </button>

    </div>
  );
}
