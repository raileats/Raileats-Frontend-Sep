"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/useCart";
import { useAuth } from "@/lib/useAuth";

export default function CheckoutPage() {

  const router = useRouter();

  const {
    items,
    clearCart,
    journey,
  } = useCart();

  const { user, loadUser } = useAuth();

  /* ================= USER ================= */

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  /* ================= JOURNEY ================= */

  const [pnr, setPnr] = useState("");
  const [coach, setCoach] = useState("");
  const [seat, setSeat] = useState("");

  /* ================= EXTRA ================= */

  const [promo, setPromo] = useState("");
  const [paymentMode, setPaymentMode] =
    useState("COD");

  /* ================= LOAD USER ================= */

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

  /* ================= CALCULATIONS ================= */

  const subtotal = items.reduce(
    (sum, i) =>
      sum + Number(i.price) * Number(i.qty),
    0
  );

  const gst = Math.round(subtotal * 0.05);

  const delivery = subtotal > 0 ? 20 : 0;

  const total =
    subtotal + gst + delivery;

  /* ================= PLACE ORDER ================= */

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

      const res = await fetch(
        "/api/order/create",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({

            customerName:
              name || "Guest",

            customerMobile: mobile,

            customerEmail:
              email || null,

            pnr: pnr || null,

            trainNumber:
              journey?.trainNumber || "",

            trainName:
              journey?.trainName || "",

            restroCode:
              journey?.restroCode ||
              firstItem?.restro_code,

            restroName:
              journey?.vendorName ||
              firstItem?.restro_name,

            stationCode:
              journey?.stationCode ||
              firstItem?.station_code,

            stationName:
              journey?.stationName ||
              firstItem?.station_name,

            arrivalDate:
              journey?.deliveryDate || "",

            arrivalTime:
              journey?.deliveryTime || "",

            coach:
              coach || null,

            seat:
              seat || null,

            paymentMode,

            promoCode:
              promo || null,

            items: items.map((i) => ({
              id: i.id,
              name: i.name,
              qty: i.qty,
              selling_price: i.price,
            })),

            subtotal,
            gst,
            delivery,
            total,

            bookingTime:
              new Date().toISOString(),

          }),
        }
      );

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

    <div className="max-w-md mx-auto h-screen overflow-hidden flex flex-col bg-[#f5f5f5] pb-24">

      {/* SCROLL AREA */}

      <div className="flex-1 overflow-y-auto p-2 space-y-2">

        {/* JOURNEY */}

        <div className="bg-white rounded-2xl border p-3 shadow-sm">

          <div className="flex justify-between items-start gap-3">

            <div className="min-w-0 flex-1">

              <div className="font-bold text-[15px]">
                Journey Details
              </div>

              <div className="mt-1 font-semibold text-[15px] truncate">
                {journey?.trainName
                  ? `${journey.trainName} #${journey.trainNumber}`
                  : `Train #${journey?.trainNumber}`}
              </div>

              <div className="text-xs text-gray-500">
                {journey?.stationName}
                {journey?.stationCode
                  ? ` (${journey.stationCode})`
                  : ""}
              </div>

            </div>

            <div className="text-right shrink-0">

              <div className="text-[11px] font-semibold leading-tight">
                {journey?.deliveryDate}
              </div>

              <div className="text-[11px] font-semibold">
                {journey?.deliveryTime}
              </div>

              <div className="mt-2 font-semibold text-[14px] leading-tight">
                {journey?.vendorName}
              </div>

            </div>

          </div>

        </div>

        {/* PASSENGER */}

        <div className="bg-white rounded-2xl border p-3 shadow-sm space-y-2">

          <div className="font-bold text-[15px]">
            Passenger Details
          </div>

          <div className="grid grid-cols-2 gap-2">

            <input
              className="border rounded-xl px-3 py-2.5 text-sm"
              placeholder="Name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />

            <input
              className="border rounded-xl px-3 py-2.5 text-sm"
              placeholder="Mobile"
              value={mobile}
              onChange={(e) =>
                setMobile(e.target.value)
              }
            />

          </div>

          <div className="grid grid-cols-2 gap-2">

            <input
              className="border rounded-xl px-3 py-2.5 text-sm"
              placeholder="Email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <input
              className="border rounded-xl px-3 py-2.5 text-sm"
              placeholder="PNR"
              value={pnr}
              onChange={(e) =>
                setPnr(e.target.value)
              }
            />

          </div>

          {/* COMPACT ROW */}

          <div className="grid grid-cols-[0.8fr_0.8fr_1fr_auto] gap-2">

            <input
              className="border rounded-xl px-2 py-2.5 text-sm"
              placeholder="Seat"
              value={seat}
              onChange={(e) =>
                setSeat(e.target.value)
              }
            />

            <input
              className="border rounded-xl px-2 py-2.5 text-sm"
              placeholder="Coach"
              value={coach}
              onChange={(e) =>
                setCoach(e.target.value)
              }
            />

            <input
              className="border rounded-xl px-2 py-2.5 text-sm"
              placeholder="Promo"
              value={promo}
              onChange={(e) =>
                setPromo(e.target.value)
              }
            />

            <button className="bg-black text-white px-3 rounded-xl text-sm font-semibold">
              Apply
            </button>

          </div>

        </div>

        {/* ORDER */}

        <div className="bg-white rounded-2xl border overflow-hidden shadow-sm flex flex-col">

          <div className="p-3 font-bold border-b text-[15px]">
            Your Order
          </div>

          {/* ONLY ITEMS SCROLL */}

          <div className="max-h-[170px] overflow-y-auto">

            <div className="p-3 space-y-3">

              {items.map((i) => (

                <div
                  key={i.id}
                  className="flex justify-between gap-3"
                >

                  <div className="flex-1 min-w-0">

                    <div className="font-medium text-sm leading-tight">
                      {i.name}
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      ₹{i.price} × {i.qty}
                    </div>

                  </div>

                  <div className="font-semibold text-sm whitespace-nowrap">
                    ₹{i.price * i.qty}
                  </div>

                </div>

              ))}

            </div>

          </div>

          {/* SUMMARY */}

          <div className="border-t p-3 space-y-1.5 text-sm">

            <Row
              label="Subtotal"
              value={subtotal}
            />

            <Row
              label="GST (5%)"
              value={gst}
            />

            <Row
              label="Delivery"
              value={delivery}
            />

            <div className="flex justify-between font-bold text-2xl pt-1">

              <span>Total</span>

              <span>₹{total}</span>

            </div>

          </div>

        </div>

        {/* PAYMENT */}

        <div className="bg-white rounded-2xl border p-3 shadow-sm">

          <div className="font-bold text-[15px] mb-2">
            Payment Method
          </div>

          <div className="grid grid-cols-2 gap-2">

            <button
              onClick={() =>
                setPaymentMode("COD")
              }
              className={`border rounded-xl py-3 text-sm font-semibold transition ${
                paymentMode === "COD"
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white"
              }`}
            >
              COD
            </button>

            <button
              onClick={() =>
                setPaymentMode("ONLINE")
              }
              className={`border rounded-xl py-3 text-sm font-semibold transition ${
                paymentMode === "ONLINE"
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white"
              }`}
            >
              Prepaid
            </button>

          </div>

        </div>

      </div>

      {/* FIXED FOOTER */}

      <div className="fixed bottom-[56px] left-0 right-0 bg-white border-t px-2 py-2">

        <div className="max-w-md mx-auto flex items-center gap-2">

          <div className="min-w-[75px]">

            <div className="text-2xl font-bold leading-none">
              ₹{total}
            </div>

            <div className="text-[10px] text-gray-500">
              Total
            </div>

          </div>

          <button
            onClick={placeOrder}
            className="flex-1 bg-green-600 text-white font-bold py-3 rounded-2xl text-base"
          >
            Place Order
          </button>

        </div>

      </div>

    </div>

  );
}

/* ================= ROW ================= */

function Row({
  label,
  value,
}: any) {

  return (

    <div className="flex justify-between">

      <span>{label}</span>

      <span className="font-medium">
        ₹{value}
      </span>

    </div>

  );
}
