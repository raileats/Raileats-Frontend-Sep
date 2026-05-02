"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/useCart";
import { useAuth } from "@/lib/useAuth";
import { useBooking } from "../../lib/useBooking";

export default function CheckoutPage() {
  const router = useRouter();

  const { items, clearCart } = useCart();
  const { user, loadUser } = useAuth();

  /* ================= USER ================= */

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setMobile(user.mobile || "");
      setEmail(user.email || "");
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

    if (!mobile) {
      alert("Mobile required");
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
          // USER
          customerName: name || "Guest",
          customerMobile: mobile,
          customerEmail: email || null,

          // TRAIN
          pnr: pnr || null,
          trainNumber: trainNo || "11016",

          // RESTRO + STATION
          restroCode: firstItem?.restro_code,
          restroName: firstItem?.restro_name,
          stationCode: firstItem?.station_code,
          stationName: firstItem?.station_name,

          // DELIVERY (❗ अभी dynamic नहीं है → बाद में fix करना)
          arrivalDate: new Date().toISOString().split("T")[0],
          arrivalTime: new Date().toLocaleTimeString(),

          // SEAT
          coach: coach || null,
          seat: seat || null,

          // PAYMENT
          paymentMode,

          // PROMO
          promoCode: promo || null,

          // ITEMS
          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            qty: i.qty,
            selling_price: i.price,
          })),

          // SUMMARY
          subtotal,
          gst,
          delivery,
          total,

          // META
          bookingTime: new Date().toISOString(),
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

      <input
        className="border p-2 w-full mb-2"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        readOnly={!!user}
      />

      <input
        className="border p-2 w-full mb-2"
        placeholder="Mobile"
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
        readOnly={!!user}
      />

      <input
        className="border p-2 w-full mb-3"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        readOnly={!!user}
      />

      {/* JOURNEY */}

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

      {/* PROMO */}

      <input
        className="border p-2 w-full mb-3"
        placeholder="Promo Code"
        value={promo}
        onChange={(e) => setPromo(e.target.value)}
      />

      {/* ORDER */}

      <div className="border p-3 rounded mb-3">
        <h3 className="font-semibold mb-2">Your Order</h3>

        {items.map((i) => (
          <div key={i.id} className="flex justify-between text-sm">
            <span>{i.name} x {i.qty}</span>
            <span>₹{i.price * i.qty}</span>
          </div>
        ))}

        <hr className="my-2" />

        <Row label="Subtotal" value={subtotal} />
        <Row label="GST (5%)" value={gst} />
        <Row label="Delivery" value={delivery} />
        <Row label="Total" value={total} bold />
      </div>

      {/* PAYMENT */}

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

      <button
        onClick={placeOrder}
        className="w-full bg-green-600 text-white py-2 rounded"
      >
        Place Order
      </button>

    </div>
  );
}

/* ================= ROW ================= */

function Row({ label, value, bold = false }: any) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : "text-sm"}`}>
      <span>{label}</span>
      <span>₹{value}</span>
    </div>
  );
}
