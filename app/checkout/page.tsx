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

  const {
    user,
    loadUser,
  } = useAuth();

  /* ================= USER ================= */

  const [name, setName] =
    useState("");

  const [mobile, setMobile] =
    useState("");

  const [email, setEmail] =
    useState("");

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {

    if (user) {

      setName(user.name || "");

      setMobile(
        user.mobile || ""
      );

      setEmail(
        user.email || ""
      );

    }

  }, [user]);

  /* ================= JOURNEY ================= */

  const [pnr, setPnr] =
    useState("");

  const [coach, setCoach] =
    useState("");

  const [seat, setSeat] =
    useState("");

  /* ================= EXTRA ================= */

  const [promo, setPromo] =
    useState("");

  const [paymentMode, setPaymentMode] =
    useState("COD");

  /* ================= CALCULATIONS ================= */

  const subtotal =
    items.reduce(
      (sum, i) =>
        sum +
        Number(i.price) *
          Number(i.qty),
      0
    );

  const gst = Math.round(
    subtotal * 0.05
  );

  const delivery =
    subtotal > 0 ? 20 : 0;

  const total =
    subtotal +
    gst +
    delivery;

  /* ================= ORDER ================= */

  const placeOrder =
    async () => {

      if (!items.length) {

        alert("Cart empty");

        return;
      }

      if (!mobile) {

        alert(
          "Mobile required"
        );

        return;
      }

      const firstItem =
        items[0];

      try {

        const res =
          await fetch(
            "/api/order/create",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({

                /* USER */

                customerName:
                  name || "Guest",

                customerMobile:
                  mobile,

                customerEmail:
                  email || null,

                /* TRAIN */

                pnr:
                  pnr || null,

                trainNumber:
                  journey?.trainNumber ||
                  null,

                trainName:
                  journey?.trainName ||
                  null,

                /* RESTRO */

                restroCode:
                  journey?.restroCode ||
                  firstItem?.restro_code,

                restroName:
                  journey?.vendorName ||
                  firstItem?.restro_name,

                /* STATION */

                stationCode:
                  journey?.stationCode ||
                  firstItem?.station_code,

                stationName:
                  journey?.stationName ||
                  firstItem?.station_name,

                /* DELIVERY */

                arrivalDate:
                  journey?.deliveryDate ||
                  null,

                arrivalTime:
                  journey?.deliveryTime ||
                  null,

                /* SEAT */

                coach:
                  coach || null,

                seat:
                  seat || null,

                /* PAYMENT */

                paymentMode,

                /* PROMO */

                promoCode:
                  promo || null,

                /* ITEMS */

                items: items.map(
                  (i) => ({
                    id: i.id,
                    name: i.name,
                    qty: i.qty,
                    selling_price:
                      i.price,
                  })
                ),

                /* SUMMARY */

                subtotal,
                gst,
                delivery,
                total,

                /* META */

                bookingTime:
                  new Date().toISOString(),

              }),
            }
          );

        const data =
          await res.json();

        if (!data.ok) {

          alert(
            "Order failed"
          );

          return;
        }

        clearCart();

        router.push(
          "/order-success"
        );

      } catch (e) {

        console.error(e);

        alert(
          "Server error"
        );

      }

    };

  /* ================= UI ================= */

  return (

    <div className="max-w-2xl mx-auto p-4 pb-32 space-y-4 bg-[#f7f7f7] min-h-screen">

      {/* HEADER */}

      <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 text-sm text-green-700 font-medium text-center">

        🔒 Your data is 100% secure and safe

      </div>

      {/* JOURNEY */}

      <div className="bg-white rounded-2xl shadow-sm border p-4">

        <div className="flex items-start justify-between">

          <div>

            <div className="text-lg font-bold text-gray-800">
              Journey Details
            </div>

            <div className="mt-3 font-semibold text-gray-800">

              {journey?.trainName
                ? `${journey.trainName} #${journey.trainNumber}`
                : journey?.trainNumber || "-"}

            </div>

            <div className="text-gray-600 text-sm mt-1">

              {journey?.stationName}
              {" "}
              ({journey?.stationCode})

            </div>

            <div className="text-gray-500 text-sm mt-1">

              {journey?.deliveryDate}
              {" "}
              {journey?.deliveryTime
                ? `at ${journey.deliveryTime}`
                : ""}

            </div>

            <div className="text-gray-700 text-sm mt-2 font-medium">

              {journey?.vendorName}

            </div>

          </div>

          <div className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">

            Active

          </div>

        </div>

      </div>

      {/* PASSENGER */}

      <div className="bg-white rounded-2xl shadow-sm border p-4">

        <div className="text-lg font-bold mb-4">
          Passenger Details
        </div>

        {/* NAME + MOBILE */}

        <div className="grid grid-cols-2 gap-3 mb-3">

          <input
            className="border p-3 rounded-xl text-sm"
            placeholder="Name"
            value={name}
            onChange={(e) =>
              setName(
                e.target.value
              )
            }
            readOnly={!!user}
          />

          <input
            className="border p-3 rounded-xl text-sm"
            placeholder="Mobile"
            value={mobile}
            onChange={(e) =>
              setMobile(
                e.target.value
              )
            }
            readOnly={!!user}
          />

        </div>

        {/* EMAIL */}

        <input
          className="border p-3 w-full mb-3 rounded-xl text-sm"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(
              e.target.value
            )
          }
          readOnly={!!user}
        />

        {/* PNR + SEAT */}

        <div className="grid grid-cols-2 gap-3 mb-3">

          <input
            className="border p-3 rounded-xl text-sm"
            placeholder="PNR (optional)"
            value={pnr}
            onChange={(e) =>
              setPnr(
                e.target.value
              )
            }
          />

          <input
            className="border p-3 rounded-xl text-sm"
            placeholder="Seat / Coach"
            value={`${coach}${seat ? ` / ${seat}` : ""}`}
            onChange={(e) => {

              const val =
                e.target.value;

              const parts =
                val.split("/");

              setCoach(
                parts[0]?.trim() || ""
              );

              setSeat(
                parts[1]?.trim() || ""
              );

            }}
          />

        </div>

        {/* PROMO */}

        <div className="flex gap-2">

          <input
            className="border p-3 flex-1 rounded-xl text-sm"
            placeholder="Promo Code"
            value={promo}
            onChange={(e) =>
              setPromo(
                e.target.value
              )
            }
          />

          <button
            className="
              bg-green-600
              text-white
              px-5
              rounded-xl
              text-sm
              font-medium
            "
          >
            Apply
          </button>

        </div>

      </div>

      {/* ORDER */}

      <div className="bg-white rounded-2xl shadow-sm border p-4">

        <h3 className="font-bold text-lg mb-4">

          Your Order

        </h3>

        <div className="space-y-3">

          {items.map((i) => (

            <div
              key={i.id}
              className="flex justify-between items-center"
            >

              <div>

                <div className="font-medium text-sm">

                  {i.name}

                </div>

                <div className="text-xs text-gray-500">

                  ₹{i.price} × {i.qty}

                </div>

              </div>

              <div className="font-semibold">

                ₹{i.price * i.qty}

              </div>

            </div>

          ))}

        </div>

        <hr className="my-4" />

        <div className="space-y-2">

          <Row
            label="Subtotal"
            value={subtotal}
          />

          <Row
            label="GST (5%)"
            value={gst}
          />

          <Row
            label="Delivery Charges"
            value={delivery}
          />

        </div>

        <div className="bg-green-50 rounded-xl p-3 mt-4 flex justify-between items-center">

          <div className="font-bold text-green-700">
            Total Payable
          </div>

          <div className="text-2xl font-bold text-green-700">
            ₹{total}
          </div>

        </div>

      </div>

      {/* PAYMENT */}

      <div className="bg-white rounded-2xl shadow-sm border p-4">

        <div className="font-bold text-lg mb-4">

          Payment Method

        </div>

        <div className="grid grid-cols-2 gap-3">

          <button
            onClick={() =>
              setPaymentMode(
                "COD"
              )
            }
            className={`border rounded-2xl p-4 text-left transition ${
              paymentMode === "COD"
                ? "border-green-600 bg-green-50"
                : ""
            }`}
          >

            <div className="font-semibold">
              COD
            </div>

            <div className="text-xs text-gray-500 mt-1">
              Pay on delivery
            </div>

          </button>

          <button
            onClick={() =>
              setPaymentMode(
                "ONLINE"
              )
            }
            className={`border rounded-2xl p-4 text-left transition ${
              paymentMode === "ONLINE"
                ? "border-green-600 bg-green-50"
                : ""
            }`}
          >

            <div className="font-semibold">
              PPD
            </div>

            <div className="text-xs text-gray-500 mt-1">
              Pay online
            </div>

          </button>

        </div>

      </div>

      {/* FIXED BOTTOM BAR */}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50">

        <div className="max-w-2xl mx-auto flex items-center gap-4">

          <div>

            <div className="text-2xl font-bold">

              ₹{total}

            </div>

            <div className="text-xs text-gray-500">

              Safe • Secure • Reliable

            </div>

          </div>

          <button
            onClick={placeOrder}
            className="
              flex-1
              bg-green-600
              text-white
              py-4
              rounded-2xl
              font-bold
              text-lg
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

      <span className="text-gray-600">
        {label}
      </span>

      <span className="font-medium">
        ₹{value}
      </span>

    </div>

  );

}
