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

export default function CheckoutPage() {
  const router = useRouter();

  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [coach, setCoach] = useState("");
  const [seat, setSeat] = useState("");

  const [payment, setPayment] = useState<"COD" | "ONLINE">("COD");

  /* ================= LOAD CART ================= */

  useEffect(() => {
    const c = getCart() as Cart | null;

    if (!c || !Array.isArray(c.items) || c.items.length === 0) {
      router.replace("/search");
      return;
    }

    setCart(c);
  }, [router]);

  if (!cart) return <div className="p-4">Loading checkout…</div>;

  /* ================= CALC ================= */

  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.selling_price * item.qty,
    0
  );

  const gst = Math.round(subtotal * 0.05);
  const delivery = 20;
  const total = subtotal + gst + delivery;

  /* ================= PLACE ORDER ================= */

  async function placeOrder() {
    if (!name || !mobile || !coach || !seat) {
      alert("Please fill all details");
      return;
    }

    try {
      setLoading(true);

      // 👉 COD
      if (payment === "COD") {
        const res = await fetch("/api/order/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restroCode: cart.restroCode,
            restroName: cart.restroName,
            stationCode: cart.stationCode,
            stationName: cart.stationName,
            arrivalDate: cart.arrivalDate,
            arrivalTime: cart.arrivalTime,
            customerName: name,
            customerMobile: mobile,
            coach,
            seat,
            items: cart.items,
            paymentType: "COD",
            totalAmount: total,
          }),
        });

        const data = await res.json();

        if (!data?.ok) {
          alert("Order failed");
          return;
        }

        clearCart();

        router.push(
          `/order-success?orderId=${data.orderId}&amount=${total}`
        );
      }

      // 👉 ONLINE
      else {
        alert("Razorpay integration next step 🔥");
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
    <div className="max-w-6xl mx-auto p-4 grid lg:grid-cols-2 gap-6">

      {/* LEFT FORM */}
      <div className="border rounded p-4 space-y-3">
        <h2 className="font-bold text-lg">Passenger Details</h2>

        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <input
          placeholder="Mobile"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <input
          placeholder="Coach (e.g. S1)"
          value={coach}
          onChange={(e) => setCoach(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <input
          placeholder="Seat No"
          value={seat}
          onChange={(e) => setSeat(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <div className="pt-3">
          <label className="block">
            <input
              type="radio"
              checked={payment === "COD"}
              onChange={() => setPayment("COD")}
            />{" "}
            Cash on Delivery
          </label>

          <label className="block">
            <input
              type="radio"
              checked={payment === "ONLINE"}
              onChange={() => setPayment("ONLINE")}
            />{" "}
            Prepaid (Online)
          </label>
        </div>
      </div>

      {/* RIGHT SUMMARY */}
      <div className="border rounded p-4">
        <h2 className="font-bold text-lg mb-3">Order Summary</h2>

        {cart.items.map((item) => (
          <div key={item.item_code} className="flex justify-between mb-2">
            <span>{item.item_name} x {item.qty}</span>
            <span>₹{item.selling_price * item.qty}</span>
          </div>
        ))}

        <hr className="my-2" />

        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{subtotal}</span>
        </div>

        <div className="flex justify-between">
          <span>GST (5%)</span>
          <span>₹{gst}</span>
        </div>

        <div className="flex justify-between">
          <span>Delivery</span>
          <span>₹{delivery}</span>
        </div>

        <div className="flex justify-between font-bold text-lg mt-2">
          <span>Total</span>
          <span>₹{total}</span>
        </div>

        <button
          onClick={placeOrder}
          disabled={loading}
          className="w-full mt-4 bg-green-600 text-white py-2 rounded"
        >
          {payment === "COD" ? "Place Order" : "Pay Now"}
        </button>
      </div>

    </div>
  );
}
