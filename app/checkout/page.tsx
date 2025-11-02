"use client";
import React, { useState } from "react";
import useCart from "../lib/useCart";
import { priceStr } from "../lib/priceUtil";
import Link from "next/link";

export default function CheckoutPage() {
  const { cart, total, clearCart } = useCart();
  const [pnr, setPnr] = useState("");
  const [coach, setCoach] = useState("");
  const [seat, setSeat] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");

  const handlePlaceOrder = () => {
    if (!pnr || !coach || !seat || !name || !mobile) {
      alert("Please fill all details");
      return;
    }

    // 🧠 Save passenger details & cart in localStorage for payment page
    localStorage.setItem(
      "raileatsOrder",
      JSON.stringify({
        pnr,
        coach,
        seat,
        name,
        mobile,
        cart,
        total,
      })
    );

    window.location.href = "/payment"; // 👈 Next step
  };

  if (!Object.keys(cart).length) {
    return (
      <main className="p-4 text-center">
        <h2 className="font-bold text-lg mb-2">Your cart is empty</h2>
        <Link href="/" className="text-green-600 underline">
          Browse Restaurants
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Passenger Details</h1>

      <div className="space-y-4">
        <input className="input" placeholder="PNR" value={pnr} onChange={(e) => setPnr(e.target.value)} />
        <input className="input" placeholder="Coach (e.g., B2)" value={coach} onChange={(e) => setCoach(e.target.value)} />
        <input className="input" placeholder="Seat Number" value={seat} onChange={(e) => setSeat(e.target.value)} />
        <input className="input" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="Mobile Number" value={mobile} onChange={(e) => setMobile(e.target.value)} />
      </div>

      <h2 className="text-lg font-semibold mt-6 mb-2">Order Summary</h2>
      {Object.values(cart).map((line) => (
        <div key={line.id} className="flex justify-between text-sm border-b py-1">
          <span>{line.name} × {line.qty}</span>
          <span>{priceStr(line.price * line.qty)}</span>
        </div>
      ))}

      <div className="flex justify-between font-bold mt-3">
        <span>Total:</span>
        <span>{priceStr(total)}</span>
      </div>

      <button
        onClick={handlePlaceOrder}
        className="w-full mt-5 bg-green-600 text-white py-2 rounded"
      >
        Proceed to Pay
      </button>
    </main>
  );
}
