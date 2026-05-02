"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/useCart";
import { useAuth } from "@/lib/useAuth";

export default function CheckoutPage() {
  const router = useRouter();

  const { items, clearCart } = useCart();
  const { user, loadUser } = useAuth();

  const [orderData, setOrderData] = useState<any>(null);

  /* LOAD ORDER DATA */
  useEffect(() => {
    const data = localStorage.getItem("temp_order");
    if (data) {
      setOrderData(JSON.parse(data));
    }
  }, []);

  /* USER */
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

  /* FORM */
  const [pnr, setPnr] = useState("");
  const [trainNo, setTrainNo] = useState("");

  /* TOTAL */
  const subtotal = items.reduce(
    (sum, i) => sum + Number(i.price) * Number(i.qty),
    0
  );

  const gst = Math.round(subtotal * 0.05);
  const delivery = subtotal > 0 ? 20 : 0;
  const total = subtotal + gst + delivery;

  /* PLACE ORDER */
  const placeOrder = async () => {
    if (!items.length) {
      alert("Cart empty");
      return;
    }

    try {
      const res = await fetch("/api/order/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: name,
          customerMobile: mobile,
          customerEmail: email,

          trainNumber: trainNo || orderData?.journey?.trainNumber,

          restroName: orderData?.vendorName,
          stationCode: orderData?.journey?.boardingStation,
          stationName: orderData?.journey?.stationName,

          arrivalDate: orderData?.journey?.arrivalDate,
          arrivalTime: orderData?.journey?.arrivalTime,

          items,
          total,
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
      alert("Error");
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">

      {/* 🔥 ORDER INFO */}
      {orderData && (
        <div className="bg-yellow-50 border p-3 mb-3 text-sm rounded">

          <div>
            <b>Delivery:</b>{" "}
            {orderData.journey?.arrivalDate}{" "}
            {orderData.journey?.arrivalTime}
          </div>

          <div>
            <b>Station:</b>{" "}
            {orderData.journey?.stationName} (
            {orderData.journey?.stationCode})
          </div>

          <div>
            <b>Vendor:</b>{" "}
            {orderData.vendorName}
          </div>

        </div>
      )}

      <h2 className="font-bold mb-3">Passenger Details</h2>

      <input
        className="border p-2 w-full mb-2"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        className="border p-2 w-full mb-2"
        placeholder="Mobile"
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
      />

      <input
        className="border p-2 w-full mb-3"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="border p-2 w-full mb-2"
        placeholder="Train No"
        value={trainNo}
        onChange={(e) => setTrainNo(e.target.value)}
      />

      <div className="border p-3 rounded mb-3">
        <h3 className="font-semibold mb-2">Your Order</h3>

        {items.map((i) => (
          <div key={i.id} className="flex justify-between text-sm">
            <span>{i.name} x {i.qty}</span>
            <span>₹{i.price * i.qty}</span>
          </div>
        ))}

        <hr className="my-2" />

        <div className="flex justify-between font-bold">
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
