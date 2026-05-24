"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/useCart";
import { useAuth } from "@/lib/useAuth";

export default function CheckoutPage() {
  const router = useRouter();

  const { items, clearCart, journey } = useCart();
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

  const [paymentMode, setPaymentMode] = useState("COD");

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
    (sum, i) => sum + Number(i.price) * Number(i.qty),
    0
  );

  const gst = Math.round(subtotal * 0.05);
  const delivery = subtotal > 0 ? 20 : 0;
  const total = subtotal + gst + delivery;

  /* ================= SAFE COALESCING VARIABLES ================= */
  // Agar context ya hook me naming convention ka difference hai to ye auto-handle kar lega
  const trainName = journey?.trainName || journey?.train_name || "N/A";
  const trainNumber = journey?.trainNumber || journey?.train_number || "";
  const stationName = journey?.stationName || journey?.station_name || "N/A";
  const stationCode = journey?.stationCode || journey?.station_code || "";
  const deliveryDate = journey?.deliveryDate || journey?.delivery_date || journey?.date || "N/A";
  const deliveryTime = journey?.deliveryTime || journey?.delivery_time || journey?.time || "N/A";
  const vendorName = journey?.vendorName || journey?.vendor_name || journey?.restroName || journey?.restro_name || "N/A";

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
      const res = await fetch("/api/order/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: name || "Guest",
          customerMobile: mobile,
          customerEmail: email || null,
          pnr: pnr || null,
          trainNumber: trainNumber,
          trainName: trainName,
          restroCode: journey?.restroCode || journey?.restro_code || firstItem?.restro_code,
          restroName: vendorName !== "N/A" ? vendorName : firstItem?.restro_name,
          stationCode: stationCode || firstItem?.station_code,
          stationName: stationName !== "N/A" ? stationName : firstItem?.station_name,
          arrivalDate: deliveryDate,
          arrivalTime: deliveryTime,
          coach: coach || null,
          seat: seat || null,
          paymentMode,
          promoCode: promo || null,
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

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-slate-50 pb-[150px]">
      {/* SCROLL AREA */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 scrollbar-hide pt-2">
        
        {/* 1. JOURNEY + PASSENGER DETAILS */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3.5">
          {/* HEADER */}
          <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3 mb-3.5">
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-[15px] text-slate-800 tracking-tight flex items-center gap-1.5">
                <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block"></span>
                Journey Details
              </h2>
              
              {/* Train Name & Number */}
              <div className="mt-2 font-bold text-sm text-slate-700 truncate flex items-center gap-1">
                <span>🚆</span>
                <span>
                  {trainName} {trainNumber ? `(${trainNumber})` : ""}
                </span>
              </div>

              {/* Station Name & Code */}
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate">
                <span>📍</span>
                <span>
                  {stationName} {stationCode ? `(${stationCode})` : ""}
                </span>
              </div>
            </div>

            {/* RIGHT DATETIME & RESTAURANT */}
            <div className="text-right text-xs font-medium text-slate-600 shrink-0 bg-slate-50 p-2 rounded-lg space-y-1 min-w-[100px]">
              <div className="flex items-center justify-end gap-1">
                <span>📅</span>
                <span>{deliveryDate}</span>
              </div>
              <div className="flex items-center justify-end gap-1">
                <span>⏰</span>
                <span>{deliveryTime}</span>
              </div>
              <div className="text-[11px] font-bold text-amber-600 truncate max-w-[120px] mt-0.5 border-t border-slate-200/60 pt-0.5">
                🎪 {vendorName}
              </div>
            </div>
          </div>

          {/* INPUT FORM */}
          <div className="space-y-2.5 text-sm">
            {/* NAME + MOBILE */}
            <div className="grid grid-cols-2 gap-2">
              <input
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 bg-slate-50/50"
                placeholder="Passenger Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 bg-slate-50/50"
                placeholder="Mobile Number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
            </div>

            {/* EMAIL + PNR */}
            <div className="grid grid-cols-2 gap-2">
              <input
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 bg-slate-50/50"
                placeholder="Email ID (Optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 bg-slate-50/50"
                placeholder="10-Digit PNR"
                value={pnr}
                onChange={(e) => setPnr(e.target.value)}
              />
            </div>

            {/* LAST ROW: SEAT + COACH + PROMO */}
            <div className="flex items-center gap-1.5 w-full">
              <input
                className="border border-slate-200 rounded-lg py-2.5 text-sm text-center focus:outline-none focus:border-amber-500 bg-slate-50/50 w-[54px] shrink-0"
                placeholder="Seat"
                value={seat}
                onChange={(e) => setSeat(e.target.value)}
              />
              <input
                className="border border-slate-200 rounded-lg py-2.5 text-sm text-center focus:outline-none focus:border-amber-500 bg-slate-50/50 w-[64px] shrink-0"
                placeholder="Coach"
                value={coach}
                onChange={(e) => setCoach(e.target.value)}
              />
              <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50/50 flex-1 min-w-0 focus-within:border-amber-500 overflow-hidden">
                <input
                  className="px-2 py-2.5 text-sm bg-transparent focus:outline-none uppercase w-full min-w-0"
                  placeholder="PROMO"
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                />
                <button className="bg-slate-900 text-white text-xs font-semibold px-2.5 py-2.5 h-full transition hover:bg-slate-800 active:scale-95 shrink-0 border-l border-slate-200">
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. YOUR ORDER CARD */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-slate-100">
            <h2 className="font-semibold text-[15px] text-slate-800 tracking-tight flex items-center gap-1.5">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block"></span>
              Your Order
            </h2>
          </div>

          {/* ITEM ROWS */}
          <div className="max-h-[170px] overflow-y-auto divide-y divide-slate-100 px-3.5">
            {items.map((i) => (
              <div key={i.id} className="flex justify-between items-center py-2.5 gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-slate-700 truncate">
                    {i.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    ₹{i.price} × {i.qty}
                  </div>
                </div>
                <div className="font-semibold text-sm text-slate-800 whitespace-nowrap">
                  ₹{i.price * i.qty}
                </div>
              </div>
            ))}
          </div>

          {/* FINAL BREAKDOWN SUMMARY */}
          <div className="border-t border-slate-100 p-3.5 bg-slate-50/40 space-y-2 border-dashed">
            <Row label="Subtotal" value={subtotal} />
            <Row label="GST (5%)" value={gst} />
            <Row label="Delivery Charges" value={delivery} />
            
            <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 border-solid mt-1">
              <span className="font-bold text-sm text-slate-800">Grand Total</span>
              <span className="font-bold text-[16px] text-slate-900">₹{total}</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. FIXED PAYMENT BOTTOM BAR */}
      <div className="fixed bottom-[56px] left-0 right-0 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] z-40">
        <div className="max-w-md mx-auto p-3.5">
          
          {/* PAYMENT MODE SELECTOR & MINI BILL */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setPaymentMode("COD")}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                  paymentMode === "COD"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Cash on Delivery
              </button>

              <button
                onClick={() => setPaymentMode("ONLINE")}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                  paymentMode === "ONLINE"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Prepaid (Online)
              </button>
            </div>

            {/* CORNER QUICK BILL DISPLAY */}
            <div className="text-right">
              <div className="text-[17px] font-bold text-slate-900 leading-none">
                ₹{total}
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-1">
                To Pay
              </div>
            </div>
          </div>

          {/* PRIMARY ACTION BUTTON */}
          <button
            onClick={placeOrder}
            className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl text-[15px] transition-all active:scale-[0.98] shadow-md shadow-green-600/10 hover:bg-green-700"
          >
            Place Order
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= COMPACT ROW COMPONENT ================= */
function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-xs text-slate-500">
      <span>{label}</span>
      <span className="font-medium text-slate-700">₹{value}</span>
    </div>
  );
}
