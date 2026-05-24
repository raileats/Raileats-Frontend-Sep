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

  const [trainNo, setTrainNo] =
    useState("");

  const [coach, setCoach] =
    useState("");

  const [seat, setSeat] =
    useState("");

  /* 🔥 AUTO FILL TRAIN */

  useEffect(() => {

    if (journey?.trainNumber) {

      setTrainNo(
        journey.trainNumber
      );

    }

  }, [journey]);

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

                /* ================= USER ================= */

                customerName:
                  name || "Guest",

                customerMobile:
                  mobile,

                customerEmail:
                  email || null,

                /* ================= TRAIN ================= */

                pnr:
                  pnr || null,

                trainNumber:
                  trainNo ||
                  journey?.trainNumber ||
                  null,

                trainName:
                  journey?.trainName ||
                  null,

                /* ================= RESTRO ================= */

                restroCode:
                  journey?.restroCode ||
                  firstItem?.restro_code,

                restroName:
                  journey?.vendorName ||
                  firstItem?.restro_name,

                /* ================= STATION ================= */

                stationCode:
                  journey?.stationCode ||
                  firstItem?.station_code,

                stationName:
                  journey?.stationName ||
                  firstItem?.station_name,

                /* ================= DELIVERY ================= */

                arrivalDate:
                  journey?.deliveryDate ||
                  null,

                arrivalTime:
                  journey?.deliveryTime ||
                  null,

                /* ================= SEAT ================= */

                coach:
                  coach || null,

                seat:
                  seat || null,

                /* ================= PAYMENT ================= */

                paymentMode,

                /* ================= PROMO ================= */

                promoCode:
                  promo || null,

                /* ================= ITEMS ================= */

                items: items.map(
                  (i) => ({
                    id: i.id,
                    name: i.name,
                    qty: i.qty,
                    selling_price:
                      i.price,
                  })
                ),

                /* ================= SUMMARY ================= */

                subtotal,
                gst,
                delivery,
                total,

                /* ================= META ================= */

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

    <div className="max-w-md mx-auto p-4 space-y-4">

      {/* ================= JOURNEY CARD ================= */}

      <div className="border rounded-xl p-4 bg-orange-50">

        <div className="font-bold text-lg mb-2">

          Journey Details

        </div>

        <div className="text-sm space-y-1">

          <div>

            <span className="font-semibold">
              Train:
            </span>{" "}

            {journey?.trainName
              ? `${journey.trainName} #${journey.trainNumber}`
              : journey?.trainNumber || "-"}

          </div>

          <div>

            <span className="font-semibold">
              Station:
            </span>{" "}

            {journey?.stationName}
            {" "}
            ({journey?.stationCode})

          </div>

          <div>

            <span className="font-semibold">
              Delivery:
            </span>{" "}

            {journey?.deliveryDate}
            {" "}
            {journey?.deliveryTime
              ? `at ${journey.deliveryTime}`
              : ""}

          </div>

          <div>

            <span className="font-semibold">
              Restro:
            </span>{" "}

            {journey?.vendorName}

          </div>

          <div>

            <span className="font-semibold">
              Restro Code:
            </span>{" "}

            {journey?.restroCode}

          </div>

        </div>

      </div>

      {/* ================= PASSENGER ================= */}

      <div>

        <h2 className="text-lg font-bold mb-3">

          Passenger Details

        </h2>

        <input
          className="border p-2 w-full mb-2 rounded"
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
          className="border p-2 w-full mb-2 rounded"
          placeholder="Mobile"
          value={mobile}
          onChange={(e) =>
            setMobile(
              e.target.value
            )
          }
          readOnly={!!user}
        />

        <input
          className="border p-2 w-full mb-3 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(
              e.target.value
            )
          }
          readOnly={!!user}
        />

      </div>

      {/* ================= TRAIN ================= */}

      <div>

        <input
          className="border p-2 w-full mb-2 rounded"
          placeholder="PNR (optional)"
          value={pnr}
          onChange={(e) =>
            setPnr(
              e.target.value
            )
          }
        />

        <input
          className="border p-2 w-full mb-2 rounded bg-gray-100"
          placeholder="Train No"
          value={trainNo}
          readOnly
        />

        <div className="flex gap-2 mb-3">

          <input
            className="border p-2 w-1/2 rounded"
            placeholder="Coach"
            value={coach}
            onChange={(e) =>
              setCoach(
                e.target.value
              )
            }
          />

          <input
            className="border p-2 w-1/2 rounded"
            placeholder="Seat"
            value={seat}
            onChange={(e) =>
              setSeat(
                e.target.value
              )
            }
          />

        </div>

      </div>

      {/* ================= PROMO ================= */}

      <input
        className="border p-2 w-full rounded"
        placeholder="Promo Code"
        value={promo}
        onChange={(e) =>
          setPromo(
            e.target.value
          )
        }
      />

      {/* ================= ORDER ================= */}

      <div className="border p-3 rounded-xl">

        <h3 className="font-semibold mb-2">

          Your Order

        </h3>

        {items.map((i) => (

          <div
            key={i.id}
            className="flex justify-between text-sm mb-1"
          >

            <span>
              {i.name} x {i.qty}
            </span>

            <span>
              ₹{i.price * i.qty}
            </span>

          </div>

        ))}

        <hr className="my-2" />

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

        <Row
          label="Total"
          value={total}
          bold
        />

      </div>

      {/* ================= PAYMENT ================= */}

      <div className="flex gap-3">

        <button
          onClick={() =>
            setPaymentMode(
              "COD"
            )
          }
          className={`flex-1 border p-2 rounded ${
            paymentMode === "COD"
              ? "bg-green-600 text-white"
              : ""
          }`}
        >
          COD
        </button>

        <button
          onClick={() =>
            setPaymentMode(
              "ONLINE"
            )
          }
          className={`flex-1 border p-2 rounded ${
            paymentMode ===
            "ONLINE"
              ? "bg-green-600 text-white"
              : ""
          }`}
        >
          PPD
        </button>

      </div>

      {/* ================= BUTTON ================= */}

      <button
        onClick={placeOrder}
        className="
          w-full
          bg-green-600
          text-white
          py-3
          rounded-xl
          font-semibold
        "
      >
        Place Order
      </button>

    </div>

  );

}

/* ================= ROW ================= */

function Row({
  label,
  value,
  bold = false,
}: any) {

  return (

    <div
      className={`flex justify-between ${
        bold
          ? "font-bold"
          : "text-sm"
      }`}
    >

      <span>
        {label}
      </span>

      <span>
        ₹{value}
      </span>

    </div>

  );

}
