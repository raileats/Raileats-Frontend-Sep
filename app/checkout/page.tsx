"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/useCart";
import { useAuth } from "@/lib/useAuth"; // ✅ ADD

export default function CheckoutPage() {
  const router = useRouter();

  const { items, clearCart } = useCart();
  const { user } = useAuth(); // ✅ ADD

  /* ================= USER ================= */

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");

  // ✅ AUTO FILL AFTER LOGIN
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setMobile(user.mobile || "");
    }
  }, [user]);

  /* ================= JOURNEY ================= */

  const [pnr, setPnr] = useState("");
  const [trainNo, setTrainNo] = useState("");
  const [coach, setCoach] = useState("");
  const [seat, setSeat] = useState("");

  /* ================= EXTRA ================= */

  const [promo, setPromo] = useState("");
  const [paymentMode, setPaymentMode] = useState("COD");

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

    try {
      const res = await fetch("/api/order/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pnr: pnr || null,
          trainNumber: trainNo || "11016",

          restroCode: firstItem?.restro_code,
          restroName: firstItem?.restro_name,

          stationCode: firstItem?.station_code,
          stationName: firstItem?.station_name,

          arrivalDate: "2026-04-18",
          arrivalTime: "12:30",

          paymentMode: paymentMode, // ✅ DYNAMIC

          customerName: name || "Guest",
          customerMobile: mobile || "",

          coach: coach || null,
          seat: seat || null,

          promoCode: promo || null,

          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            qty: i.qty,
            selling_price: i.price,
          })),
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        alert("Order failed");
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

      {/* ✅ NAME (LOCKED AFTER LOGIN) */}
      <input
        className="border p-2 w-full mb-2"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        readOnly={!!user}
      />

      {/* ✅ MOBILE (LOCKED AFTER LOGIN) */}
      <input
        className="border p-2 w-full mb-3"
        placeholder="Mobile"
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
        readOnly={!!user}
      />

      {/* ================= JOURNEY ================= */}

      <input
        className="border p-2 w-full mb-2"
        placeholder="PNR (optional)"
        value={pnr}
        onChange={(e) => setPnr(e.target.value)}
      />

      <input
        className="border p-2 w-full mb-2"
        placeholder="Train No"
        value={trainNo}
        onChange={(e) => setTrainNo(e.target.value)}
      />

      <div className="flex gap-2 mb-3">
        <input
          className="border p-2 w-1/2"
          placeholder="Coach"
          value={coach}
          onChange={(e) => setCoach(e.target.value)}
        />

        <input
          className="border p-2 w-1/2"
          placeholder="Seat"
          value={seat}
          onChange={(e) => setSeat(e.target.value)}
        />
      </div>

      {/* ================= PROMO ================= */}

      <input
        className="border p-2 w-full mb-3"
        placeholder="Promo Code (optional)"
        value={promo}
        onChange={(e) => setPromo(e.target.value)}
      />

      {/* ================= ORDER SUMMARY ================= */}

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

      {/* ================= PAYMENT ================= */}

      <div className="flex gap-3 mb-3">
        <button
          onClick={() => setPaymentMode("COD")}
          className={`flex-1 border p-2 ${
            paymentMode === "COD" ? "bg-green-600 text-white" : ""
          }`}
        >
          COD
        </button>

        <button
          onClick={() => setPaymentMode("ONLINE")}
          className={`flex-1 border p-2 ${
            paymentMode === "ONLINE" ? "bg-green-600 text-white" : ""
          }`}
        >
          PPD
        </button>
      </div>

      {paymentMode === "ONLINE" && (
        <select className="border p-2 w-full mb-3">
          <option>UPI</option>
          <option>Net Banking</option>
          <option>Card</option>
        </select>
      )}

      {/* ================= BUTTON ================= */}

      <button
        onClick={placeOrder}
        className="w-full bg-green-600 text-white py-2 rounded"
      >
        Place Order
      </button>

    </div>
  );
}
