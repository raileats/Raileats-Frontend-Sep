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

  /* ================= EXTRA ================= */

  const [pnr, setPnr] =
    useState("");

  const [seat, setSeat] =
    useState("");

  const [coach, setCoach] =
    useState("");

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
        alert("Mobile required");
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

                customerName:
                  name || "Guest",

                customerMobile:
                  mobile,

                customerEmail:
                  email || null,

                pnr:
                  pnr || null,

                trainNumber:
                  journey?.trainNumber ||
                  null,

                trainName:
                  journey?.trainName ||
                  null,

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
                  journey?.deliveryDate ||
                  null,

                arrivalTime:
                  journey?.deliveryTime ||
                  null,

                coach:
                  coach || null,

                seat:
                  seat || null,

                paymentMode,

                promoCode:
                  promo || null,

                items: items.map(
                  (i) => ({
                    id: i.id,
                    name: i.name,
                    qty: i.qty,
                    selling_price:
                      i.price,
                  })
                ),

                subtotal,
                gst,
                delivery,
                total,

                bookingTime:
                  new Date().toISOString(),

              }),
            }
          );

        const data =
          await res.json();

        if (!data.ok) {
          alert("Order failed");
          return;
        }

        clearCart();

        router.push(
          "/order-success"
        );

      } catch (e) {

        console.error(e);

        alert("Server error");

      }

    };

  /* ================= UI ================= */

  return (

    <div className="max-w-md mx-auto bg-[#f6f6f6] min-h-screen pb-40">

      {/* TOP */}

      <div className="px-4 pt-4">

        <div className="
          border
          rounded-2xl
          bg-white
          p-3
          shadow-sm
        ">

          <div className="
            flex
            justify-between
            gap-3
          ">

            {/* LEFT */}

            <div className="flex-1">

              <div className="
                text-base
                font-bold
                mb-2
              ">
                Journey Details
              </div>

              <div className="
                text-sm
                font-semibold
              ">

                {journey?.trainName
                  ? `${journey.trainName} #${journey.trainNumber}`
                  : `Train #${journey?.trainNumber}`}

              </div>

              <div className="
                text-xs
                text-gray-500
                mt-1
              ">

                {journey?.stationName}
                {" "}
                ({journey?.stationCode})

              </div>

            </div>

            {/* RIGHT */}

            <div className="
              text-right
              min-w-[120px]
            ">

              <div className="
                text-xs
                text-gray-500
              ">
                Delivery
              </div>

              <div className="
                text-sm
                font-medium
              ">

                {journey?.deliveryDate}

              </div>

              <div className="
                text-sm
                font-medium
              ">

                {journey?.deliveryTime}

              </div>

              <div className="
                text-xs
                text-gray-500
                mt-2
              ">
                Restaurant
              </div>

              <div className="
                text-sm
                font-medium
              ">

                {journey?.vendorName}

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* PASSENGER */}

      <div className="px-4 mt-4">

        <div className="
          bg-white
          border
          rounded-2xl
          p-3
          shadow-sm
        ">

          <div className="
            text-base
            font-bold
            mb-3
          ">
            Passenger Details
          </div>

          {/* ROW 1 */}

          <div className="
            grid
            grid-cols-2
            gap-2
            mb-2
          ">

            <div>

              <div className="
                text-[11px]
                text-gray-500
                mb-1
              ">
                Name
              </div>

              <input
                className="
                  border
                  rounded-xl
                  p-2.5
                  text-sm
                  w-full
                "
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
              />

            </div>

            <div>

              <div className="
                text-[11px]
                text-gray-500
                mb-1
              ">
                Mobile
              </div>

              <input
                className="
                  border
                  rounded-xl
                  p-2.5
                  text-sm
                  w-full
                "
                value={mobile}
                onChange={(e) =>
                  setMobile(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          {/* ROW 2 */}

          <div className="
            grid
            grid-cols-2
            gap-2
            mb-2
          ">

            <div>

              <div className="
                text-[11px]
                text-gray-500
                mb-1
              ">
                Email
              </div>

              <input
                className="
                  border
                  rounded-xl
                  p-2.5
                  text-sm
                  w-full
                "
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
              />

            </div>

            <div>

              <div className="
                text-[11px]
                text-gray-500
                mb-1
              ">
                PNR
              </div>

              <input
                className="
                  border
                  rounded-xl
                  p-2.5
                  text-sm
                  w-full
                "
                value={pnr}
                onChange={(e) =>
                  setPnr(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          {/* ROW 3 */}

          <div className="
            grid
            grid-cols-2
            gap-2
            mb-3
          ">

            <div>

              <div className="
                text-[11px]
                text-gray-500
                mb-1
              ">
                Seat
              </div>

              <input
                className="
                  border
                  rounded-xl
                  p-2.5
                  text-sm
                  w-full
                "
                value={seat}
                onChange={(e) =>
                  setSeat(
                    e.target.value
                  )
                }
              />

            </div>

            <div>

              <div className="
                text-[11px]
                text-gray-500
                mb-1
              ">
                Coach
              </div>

              <input
                className="
                  border
                  rounded-xl
                  p-2.5
                  text-sm
                  w-full
                "
                value={coach}
                onChange={(e) =>
                  setCoach(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          {/* PROMO */}

          <div className="
            flex
            gap-2
          ">

            <input
              className="
                border
                rounded-xl
                p-2.5
                text-sm
                flex-1
              "
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
                bg-black
                text-white
                px-4
                rounded-xl
                text-sm
                font-medium
              "
            >
              Apply
            </button>

          </div>

        </div>

      </div>

      {/* ORDER */}

      <div className="px-4 mt-4">

        <div className="
          bg-white
          border
          rounded-2xl
          shadow-sm
        ">

          {/* HEADER */}

          <div className="
            p-3
            border-b
            font-bold
            text-base
          ">
            Your Order
          </div>

          {/* SCROLLABLE ITEMS */}

          <div className="
            max-h-[220px]
            overflow-y-auto
            p-3
            space-y-3
          ">

            {items.map((i) => (

              <div
                key={i.id}
                className="
                  flex
                  justify-between
                  gap-3
                "
              >

                <div className="flex-1">

                  <div className="
                    text-sm
                    font-medium
                  ">
                    {i.name}
                  </div>

                  <div className="
                    text-xs
                    text-gray-500
                    mt-1
                  ">

                    ₹{i.price}
                    {" "}
                    ×
                    {" "}
                    {i.qty}

                  </div>

                </div>

                <div className="
                  text-sm
                  font-semibold
                ">

                  ₹{i.price * i.qty}

                </div>

              </div>

            ))}

          </div>

          {/* BILL */}

          <div className="
            border-t
            p-3
            space-y-2
          ">

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

            <div className="
              flex
              justify-between
              items-center
              pt-2
              border-t
              mt-2
            ">

              <div className="
                text-base
                font-bold
              ">
                Total Payable
              </div>

              <div className="
                text-2xl
                font-bold
              ">
                ₹{total}
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* PAYMENT */}

      <div className="px-4 mt-4">

        <div className="
          bg-white
          border
          rounded-2xl
          p-3
          shadow-sm
        ">

          <div className="
            text-base
            font-bold
            mb-3
          ">
            Payment Method
          </div>

          <div className="
            grid
            grid-cols-2
            gap-2
          ">

            <button
              onClick={() =>
                setPaymentMode(
                  "COD"
                )
              }
              className={`
                border
                rounded-xl
                p-3
                text-sm
                font-semibold
                transition
                ${
                  paymentMode === "COD"
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white"
                }
              `}
            >
              COD
            </button>

            <button
              onClick={() =>
                setPaymentMode(
                  "ONLINE"
                )
              }
              className={`
                border
                rounded-xl
                p-3
                text-sm
                font-semibold
                transition
                ${
                  paymentMode === "ONLINE"
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white"
                }
              `}
            >
              Prepaid
            </button>

          </div>

        </div>

      </div>

      {/* FOOTER */}

      <div className="
        fixed
        bottom-[58px]
        left-0
        right-0
        bg-white
        border-t
        p-3
        z-40
      ">

        <div className="
          max-w-md
          mx-auto
          flex
          items-center
          gap-3
        ">

          <div>

            <div className="
              text-2xl
              font-bold
            ">
              ₹{total}
            </div>

            <div className="
              text-[11px]
              text-gray-500
            ">
              Total Amount
            </div>

          </div>

          <button
            onClick={placeOrder}
            className="
              flex-1
              bg-green-600
              text-white
              py-3
              rounded-2xl
              font-bold
              text-base
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

    <div className="
      flex
      justify-between
      text-sm
    ">

      <span className="
        text-gray-600
      ">
        {label}
      </span>

      <span className="
        font-semibold
      ">
        ₹{value}
      </span>

    </div>

  );

}
