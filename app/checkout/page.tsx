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

  if (!lines || lines.length === 0) {
    return <div className="p-6 text-center text-gray-500">Cart is empty</div>;
  }

  async function placeOrder() {
    if (!name || !mobile || !seat || !coach) {
      alert("Fill all details");
      return;
    }

    try {
      setLoading(true);

      // 👉 CART se required values nikaal rahe hain
      const firstItem = lines[0];

      const payload = {
        restroCode: firstItem.restro_code,
        restroName: firstItem.restro_name || "Restaurant",
        stationCode: firstItem.station_code || "NA",
        stationName: firstItem.station_name || "Station",
        arrivalDate: new Date().toISOString().slice(0, 10),
        arrivalTime: new Date().toTimeString().slice(0, 5),

        customerName: name,
        customerMobile: mobile,
        paymentMode: payment,

        items: lines.map((l) => ({
          item_name: l.name,
          selling_price: l.price,
          qty: l.qty,
        })),
      };

      const res = await fetch("/api/order/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data?.orderId) {
        alert("Order failed (Admin API)");
        return;
      }

      clearCart();

      router.push(
        `/order-success?orderId=${data.orderId}&amount=${data.totalAmount}`
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
      <div className="lg:col-span-2 space-y-4">

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
          <h2 className="font-semibold mb-2">Payment Mode</h2>

          <label className="block">
            <input
              type="radio"
              checked={payment === "COD"}
              onChange={() => setPayment("COD")}
            /> COD
          </label>

          <label className="block">
            <input
              type="radio"
              checked={payment === "PREPAID"}
              onChange={() => setPayment("PREPAID")}
            /> Prepaid
          </label>
        </div>

      </div>

      {/* RIGHT */}
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
