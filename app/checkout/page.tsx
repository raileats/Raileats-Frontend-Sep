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

  /* ================= EXTRA ================= */

  const [pnr, setPnr] = useState("");
  const [coach, setCoach] = useState("");
  const [seat, setSeat] = useState("");
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

    <div className="max-w-md mx-auto h-screen overflow-hidden flex flex-col bg-[#f5f5f5] pb-[145px]">

      {/* SCROLL AREA */}

      <div className="flex-1 overflow-y-auto p-2 space-y-2">

        {/* JOURNEY + PASSENGER */}

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

          <div className="p-3">

            {/* TOP */}

            <div className="flex justify-between gap-3">

              {/* LEFT */}

              <div className="flex-1 min-w-0">

                <div className="font-bold text-[16px]">
                  Journey Details
                </div>

                <div className="mt-2 font-bold text-[16px] leading-tight truncate">
                  {journey?.trainName
                    ? `${journey.trainName} #${journey.trainNumber}`
                    : `Train #${journey?.trainNumber}`}
                </div>

                <div className="text-sm text-gray-500 mt-1">
                  {journey?.stationName}
                  {journey?.stationCode
                    ? ` (${journey.stationCode})`
                    : ""}
                </div>

              </div>

              {/* RIGHT */}

              <div className="text-right shrink-0">

                <div className="font-semibold text-[13px] leading-tight">
                  {journey?.deliveryDate}
                </div>

                <div className="font-semibold text-[13px]">
                  {journey?.deliveryTime}
                </div>

                <div className="mt-3 font-bold text-[15px] leading-tight">
                  {journey?.vendorName}
                </div>

              </div>

            </div>

            {/* DIVIDER */}

            <div className="border-t my-3" />

            {/* NAME + MOBILE */}

            <div className="grid grid-cols-[1.25fr_1fr] gap-2 mb-2">

              <input
                className="border rounded-xl px-3 py-3 text-sm"
                placeholder="Name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
              />

              <input
                className="border rounded-xl px-3 py-3 text-sm"
                placeholder="Mobile"
                value={mobile}
                onChange={(e) =>
                  setMobile(e.target.value)
                }
              />

            </div>

            {/* EMAIL + PNR */}

            <div className="grid grid-cols-[1.25fr_1fr] gap-2 mb-2">

              <input
                className="border rounded-xl px-3 py-3 text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
              />

              <input
                className="border rounded-xl px-3 py-3 text-sm"
                placeholder="PNR"
                value={pnr}
                onChange={(e) =>
                  setPnr(e.target.value)
                }
              />

            </div>

            {/* LAST ROW */}

            <div className="grid grid-cols-[58px_70px_1fr_68px] gap-2">

              <input
                className="border rounded-xl px-2 py-3 text-sm"
                placeholder="Seat"
                value={seat}
                onChange={(e) =>
                  setSeat(e.target.value)
                }
              />

              <input
                className="border rounded-xl px-2 py-3 text-sm"
                placeholder="Coach"
                value={coach}
                onChange={(e) =>
                  setCoach(e.target.value)
                }
              />

              <input
                className="border rounded-xl px-3 py-3 text-sm min-w-0"
                placeholder="Promo"
                value={promo}
                onChange={(e) =>
                  setPromo(e.target.value)
                }
              />

              <button
                className="
                  bg-black
                  text-white
                  rounded-xl
                  text-sm
                  font-semibold
                "
              >
                Apply
              </button>

            </div>

          </div>

        </div>

        {/* ORDER */}

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

          <div className="p-3 border-b font-bold text-[16px]">
            Your Order
          </div>

          {/* ONLY ITEMS SCROLL */}

          <div className="max-h-[180px] overflow-y-auto">

            <div className="p-3 space-y-4">

              {items.map((i) => (

                <div
                  key={i.id}
                  className="flex justify-between gap-3"
                >

                  <div className="flex-1 min-w-0">

                    <div className="font-semibold text-[15px] leading-tight">
                      {i.name}
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      ₹{i.price} × {i.qty}
                    </div>

                  </div>

                  <div className="font-bold text-[15px] whitespace-nowrap">
                    ₹{i.price * i.qty}
                  </div>

                </div>

              ))}

            </div>

          </div>

          {/* SUMMARY */}

          <div className="border-t p-3 space-y-1.5">

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

            <div className="flex justify-between items-center pt-1">

              <span className="font-bold text-[18px]">
                Total
              </span>

              <span className="font-bold text-[22px]">
                ₹{total}
              </span>

            </div>

          </div>

        </div>

      </div>

      {/* FIXED PAYMENT + PLACE ORDER */}

      <div className="fixed bottom-[56px] left-0 right-0 bg-white border-t shadow-[0_-2px_10px_rgba(0,0,0,0.06)] z-50">

        <div className="max-w-md mx-auto px-2 py-2">

          {/* PAYMENT */}

          <div className="grid grid-cols-[95px_95px_1fr] gap-2 mb-2">

            <button
              onClick={() =>
                setPaymentMode("COD")
              }
              className={`rounded-xl py-2.5 text-sm font-semibold border transition ${
                paymentMode === "COD"
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-black border-gray-300"
              }`}
            >
              COD
            </button>

            <button
              onClick={() =>
                setPaymentMode("ONLINE")
              }
              className={`rounded-xl py-2.5 text-sm font-semibold border transition ${
                paymentMode === "ONLINE"
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-black border-gray-300"
              }`}
            >
              Prepaid
            </button>

            <div className="flex items-center justify-end pr-2">

              <div>

                <div className="text-2xl font-bold leading-none text-right">
                  ₹{total}
                </div>

                <div className="text-[10px] text-gray-500 text-right">
                  Total
                </div>

              </div>

            </div>

          </div>

          {/* BUTTON */}

          <button
            onClick={placeOrder}
            className="
              w-full
              bg-green-600
              text-white
              font-bold
              py-3.5
              rounded-2xl
              text-base
              active:scale-[0.99]
            "
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

    <div className="flex justify-between text-sm">

      <span>{label}</span>

      <span className="font-semibold">
        ₹{value}
      </span>

    </div>

  );
}
