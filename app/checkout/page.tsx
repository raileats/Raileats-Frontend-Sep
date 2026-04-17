"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/useCart";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, clearCart } = useCart();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [seat, setSeat] = useState("");
  const [coach, setCoach] = useState("");
  const [payment, setPayment] = useState("COD");
  const [loading, setLoading] = useState(false);

  if (!lines || lines.length === 0) {
    return <div className="p-6 text-center">Cart is empty</div>;
  }

  const subTotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const gst = Math.round(subTotal * 0.05);
  const delivery = subTotal > 0 ? 20 : 0;
  const finalTotal = subTotal + gst + delivery;

  async function placeOrder() {
    if (!name || !mobile || !seat || !coach) {
      alert("Fill all details");
      return;
    }

    try {
      setLoading(true);

      const firstItem = lines[0];

      const payload = {
        // 🔥 IMPORTANT FULL DATA
        pnr: "1234567890",
        trainNumber: "11016",
        trainName: "Demo Express",

        restroCode: String(firstItem?.id || "1004"),
        restroName: firstItem?.name || "Restaurant",

        stationCode: "BPL",
        stationName: "Bhopal",

        arrivalDate: new Date().toISOString().slice(0, 10),
        arrivalTime: new Date().toTimeString().slice(0, 5),

        paymentMode: payment,

        customerName: name,
        customerMobile: mobile,

        // ✅ CRITICAL FIX
        items: lines.map((l) => ({
          item_name: l.name,
          selling_price: Number(l.price),
          qty: Number(l.qty),
        })),
      };

      console.log("PAYLOAD =>", payload);

      const res = await fetch("/api/order/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      console.log("API RESPONSE =>", data);

      if (!res.ok || !data?.orderId) {
        alert("Order failed (Admin API)");
        return;
      }

      clearCart();

      router.push(
        `/order-success?orderId=${data.orderId}&amount=${finalTotal}`
      );

    } catch (err) {
      console.error(err);
      alert("Error placing order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* LEFT */}
      <div className="space-y-4">

        <h1 className="text-xl font-bold">Passenger Details</h1>

        <input
          placeholder="Name"
          className="border p-2 w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Mobile"
          className="border p-2 w-full"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Coach"
            className="border p-2"
            value={coach}
            onChange={(e) => setCoach(e.target.value)}
          />
          <input
            placeholder="Seat"
            className="border p-2"
            value={seat}
            onChange={(e) => setSeat(e.target.value)}
          />
        </div>

        <div className="border p-3 rounded">
          <h2>Payment Mode</h2>

          <label>
            <input
              type="radio"
              checked={payment === "COD"}
              onChange={() => setPayment("COD")}
            /> COD
          </label>

          <label>
            <input
              type="radio"
              checked={payment === "PREPAID"}
              onChange={() => setPayment("PREPAID")}
            /> Prepaid
          </label>
        </div>

      </div>

      {/* RIGHT */}
      <div className="border p-4 rounded">

        <h3>Your Order</h3>

        {lines.map((l) => (
          <div key={l.id} className="flex justify-between text-sm">
            <span>{l.name}</span>
            <span>{l.qty}</span>
          </div>
        ))}

        <hr className="my-2" />

        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>₹{subTotal}</span>
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
          <span>₹{finalTotal}</span>
        </div>

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
