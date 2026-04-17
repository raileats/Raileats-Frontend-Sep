"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/useCart";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, total, clearCart } = useCart();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [seat, setSeat] = useState("");
  const [coach, setCoach] = useState("");
  const [payment, setPayment] = useState("COD");
  const [loading, setLoading] = useState(false);

  // ❌ Cart empty
  if (!lines || lines.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        Cart is empty
      </div>
    );
  }

  /* ================= PLACE ORDER ================= */

  async function placeOrder() {
    if (!name || !mobile || !seat || !coach) {
      alert("Fill all details");
      return;
    }

    try {
      setLoading(true);

      const orderId = "RE" + Date.now();

      const payload = {
        orderId,
        name,
        mobile,
        seat,
        coach,
        paymentMode: payment,
        items: lines,
        totalAmount: total,
      };

      // ✅ ADMIN API CALL
     const res = await fetch("/api/create-order", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

      if (!res.ok) {
        alert("Order failed (Admin API)");
        return;
      }

      clearCart();

      // ✅ SUCCESS REDIRECT
      if (payment === "COD") {
        router.push(`/order-success?orderId=${orderId}`);
      } else {
        router.push(`/payment?orderId=${orderId}`);
      }

    } catch (err) {
      console.error(err);
      alert("Error placing order");
    } finally {
      setLoading(false);
    }
  }

  /* ================= UI ================= */

  return (
    <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* LEFT FORM */}
      <div className="lg:col-span-2 space-y-4">

        <h1 className="text-xl font-bold">Passenger Details</h1>

        <input
          placeholder="Name"
          className="border p-2 w-full"
          value={name}
          onChange={(e)=>setName(e.target.value)}
        />

        <input
          placeholder="Mobile"
          className="border p-2 w-full"
          value={mobile}
          onChange={(e)=>setMobile(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Coach"
            className="border p-2"
            value={coach}
            onChange={(e)=>setCoach(e.target.value)}
          />
          <input
            placeholder="Seat"
            className="border p-2"
            value={seat}
            onChange={(e)=>setSeat(e.target.value)}
          />
        </div>

        {/* Payment */}
        <div className="border p-3 rounded">
          <h2 className="font-semibold mb-2">Payment Mode</h2>

          <label className="block">
            <input
              type="radio"
              checked={payment === "COD"}
              onChange={()=>setPayment("COD")}
            /> COD
          </label>

          <label className="block">
            <input
              type="radio"
              checked={payment === "PREPAID"}
              onChange={()=>setPayment("PREPAID")}
            /> Prepaid
          </label>
        </div>

      </div>

      {/* RIGHT CART */}
      <div className="border p-4 rounded h-fit">

        <h3 className="font-semibold mb-2">Your Order</h3>

        {lines.map((l) => (
          <div key={l.id} className="flex justify-between text-sm mb-1">
            <span>{l.name}</span>
            <span>{l.qty}</span>
          </div>
        ))}

        <div className="mt-3 font-bold">Total: ₹{total}</div>

        <button
          onClick={placeOrder}
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 mt-3 rounded"
        >
          {loading
            ? "Processing..."
            : payment === "COD"
            ? "Place Order"
            : "Pay Now"}
        </button>

      </div>

    </div>
  );
}
