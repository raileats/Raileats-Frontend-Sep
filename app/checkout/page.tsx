"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/lib/useCart";
import { useAuth } from "@/lib/useAuth";

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { items, clearCart, journey } = useCart();
  const cartItems = Array.isArray(items) ? items : [];
  const { user, loadUser } = useAuth();

  /* ================= USER ================= */
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  /* ================= EXTRA ================= */
  const [pnr, setPnr] = useState("");
  const [pnrError, setPnrError] = useState("");
  const [coach, setCoach] = useState("");
  const [seat, setSeat] = useState("");
  const [isPnrLocked, setIsPnrLocked] = useState(false);
  const [isPnrVerified, setIsPnrVerified] = useState(false);
  const [promo, setPromo] = useState("");

  const [paymentMode, setPaymentMode] = useState("COD");

  /* ================= LOAD USER ================= */
  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      
      // Mobile se +91 strip karne ke liye logic
      let rawMobile = user.mobile || "";
      if (rawMobile.startsWith("+91")) {
        rawMobile = rawMobile.replace("+91", "").trim();
      } else if (rawMobile.length > 10 && rawMobile.startsWith("91")) {
        rawMobile = rawMobile.substring(2);
      }
      setMobile(rawMobile);
    }
  }, [user]);

  /* ================= PNR AUTO LOAD ================= */
useEffect(() => {
  try {
    const urlPnr = searchParams.get("pnr");

    if (!urlPnr) {
      setPnr("");
      setCoach("");
      setSeat("");
      setIsPnrLocked(false);
      return;
    }

    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("raileats_pnr_details")
        : null;

    if (!saved) return;

    const parsed = JSON.parse(saved);

    if (parsed?.pnr === urlPnr) {
      setPnr(parsed?.pnr || "");
      setCoach(parsed?.coach || "");
      setSeat(parsed?.berth || "");
      setIsPnrLocked(true);
    }
  } catch (e) {
    console.error("PNR preload failed", e);
  }
}, [searchParams]);

  /* ================= SAFE COALESCING VARIABLES ================= */
  const trainName = journey?.trainName || "N/A";
  const trainNumber = journey?.trainNumber || "";
  const stationName = journey?.stationName || "N/A";
  const stationCode = journey?.stationCode || "";
  const deliveryDate = journey?.deliveryDate || "N/A";
  const deliveryTime = journey?.deliveryTime || "N/A";
  const vendorName = journey?.vendorName || "N/A";

  /* ================= FETCH PNR DETAILS ================= */
useEffect(() => {
  function formatDateForTrainPage(value: string) {
    if (!value) return "";

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  }

  function normalizeDate(value: any) {
    if (!value) return "";

    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }

    return String(value || "").trim().toLowerCase();
  }

  async function fetchPnrDetails() {
    if (!pnr || pnr.length !== 10) {
      setPnrError("");
      setIsPnrVerified(false);
      return;
    }

    try {
      const res = await fetch(`/api/pnr/${encodeURIComponent(pnr)}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!data?.ok) {
        setPnrError("Invalid PNR");
        setCoach("");
        setSeat("");
        setIsPnrVerified(false);
        return;
      }

      const pnrTrainNo = String(
        data.trainNo || data.trainNumber || data.raw?.trainNumber || ""
      );

      const pnrTrainName = data.trainName || data.raw?.trainName || "Train";

      const pnrBoarding = String(
        data.boardingPoint || data.source || data.raw?.boardingPoint || ""
      ).toUpperCase();

      const pnrJourneyDate = formatDateForTrainPage(
        data.dateOfJourney || data.raw?.dateOfJourney || ""
      );

      const currentTrainNo = String(trainNumber || "");

      if (currentTrainNo && pnrTrainNo && pnrTrainNo !== currentTrainNo) {
        setPnrError("PNR not belongs to booking train");
        setCoach("");
        setSeat("");
        setIsPnrVerified(false);
        setIsPnrLocked(false);
        return;
      }

      if (!pnrTrainNo || !pnrJourneyDate || !pnrBoarding) {
        setPnrError("PNR data incomplete");
        setCoach("");
        setSeat("");
        setIsPnrVerified(false);
        setIsPnrLocked(false);
        return;
      }

      const routeRes = await fetch(
        `/api/train-restros?train=${encodeURIComponent(
          pnrTrainNo
        )}&date=${encodeURIComponent(
          pnrJourneyDate
        )}&boarding=${encodeURIComponent(pnrBoarding)}&full=1`,
        { cache: "no-store" }
      );

      const routeData = await routeRes.json();

      const matchedStation = (routeData?.stations || []).find((s: any) => {
        return (
          String(s.StationCode || "").toUpperCase() ===
          String(stationCode || "").toUpperCase()
        );
      });

      if (!matchedStation) {
        setPnrError("PNR route does not match delivery station");
        setCoach("");
        setSeat("");
        setIsPnrVerified(false);
        setIsPnrLocked(false);
        return;
      }

      if (normalizeDate(matchedStation.date) !== normalizeDate(deliveryDate)) {
        setPnrError("Date mismatch");
        setCoach("");
        setSeat("");
        setIsPnrVerified(false);
        setIsPnrLocked(false);
        return;
      }

      const passenger =
        data.passengers?.[0] ||
        data.raw?.passengerList?.[0] ||
        {};

      const fetchedCoach =
        passenger.currentCoachId ||
        passenger.coachId ||
        passenger.bookingCoachId ||
        passenger.BookingCoachId ||
        "";

      const fetchedSeat =
        passenger.currentBerthNo ||
        passenger.berthNo ||
        passenger.bookingBerthNo ||
        passenger.BookingBerthNo ||
        "";

      setPnrError("");
      setCoach(String(fetchedCoach || ""));
      setSeat(String(fetchedSeat || ""));
      setIsPnrLocked(true);
      setIsPnrVerified(true);

      localStorage.setItem(
        "raileats_pnr_details",
        JSON.stringify({
          pnr,
          trainNo: pnrTrainNo,
          trainName: pnrTrainName,
          boarding: pnrBoarding,
          journeyDate: pnrJourneyDate,
          source: data.source || data.raw?.sourceStation || "",
          destination: data.destination || data.raw?.destinationStation || "",
          chartStatus: data.chartStatus || data.raw?.chartStatus || "",
          coach: fetchedCoach,
          berth: fetchedSeat,
          passengersCount:
            data.passengersCount || data.raw?.numberOfpassenger || 1,
          passengers: data.passengers || data.raw?.passengerList || [],
          raw: data.raw || data,
        })
      );
    } catch (e) {
      setPnrError("PNR fetch failed");
      setCoach("");
      setSeat("");
      setIsPnrVerified(false);
      setIsPnrLocked(false);
      console.error("PNR fetch failed", e);
    }
  }

  fetchPnrDetails();
}, [pnr, trainNumber, stationCode, deliveryDate]);
  /* ================= CALCULATIONS ================= */
  const subtotal = cartItems.reduce(
    (sum, i) => sum + Number(i.price) * Number(i.qty),
    0
  );

  const gst = Math.round(subtotal * 0.05);
  const delivery = subtotal > 0 ? 20 : 0;
  const total = subtotal + gst + delivery;
  const isOrderReady =
  !!name &&
  !!mobile &&
  !!trainNumber &&
  !!deliveryDate &&
  deliveryDate !== "N/A" &&
  !!deliveryTime &&
  deliveryTime !== "N/A" &&
  !!pnr &&
  !!coach &&
  !!seat &&
  isPnrVerified &&
  !pnrError &&
  cartItems.length > 0;

  /* ================= PLACE ORDER ================= */
  const placeOrder = async () => {
    if (!cartItems.length) {
      alert("Cart empty");
      return;
    }

    if (!mobile) {
      alert("Mobile required");
      return;
    }

    const firstItem = cartItems[0];
    const rawRestroCode = journey?.restroCode || firstItem?.restro_code;
    const cleanRestroCode = rawRestroCode ? parseInt(rawRestroCode.toString(), 10) : 0;

    try {
      // 🔥 FIX: 'as any' bypass lagaya hai taaki strict type validation break na kare
      const formattedItems = cartItems.map((item) => {
        const i = item as any; 
        return {
          id: i.id,
          name: i.name,
          qty: i.qty,
          price: i.price,
          description: i.description || i.ItemDescription || null,
          category: i.category || i.ItemCategory || null,
          cuisine: i.cuisine || i.Cuisine || null,
          menu_type: i.menu_type || i.menuType || i.MenuType || null,
          gst_percent: i.gst_percent || 5.00,
          CreatedAt: new Date().toISOString(),
        };
      });

      const res = await fetch("/api/order/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          RestroCode: cleanRestroCode,
          RestroName: vendorName !== "N/A" ? vendorName : (firstItem?.restro_name || "N/A"),
          StationCode: stationCode || firstItem?.station_code || "N/A",
          StationName: stationName !== "N/A" ? stationName : (firstItem?.station_name || "N/A"),
          DeliveryDate: deliveryDate, 
          DeliveryTime: deliveryTime,
          TrainNumber: trainNumber || "N/A",
          Coach: coach || null,
          Seat: seat || null,
          CustomerName: name || "Guest",
          CustomerMobile: mobile,
          SubTotal: subtotal,
          GSTAmount: gst,
          PlatformCharge: delivery,
          TotalAmount: total,
          PaymentMode: paymentMode,
          Status: "Booked",
          Items: formattedItems, 
          JourneyPayload: {
            pnr: pnr || null,
            promoCode: promo || null,
            trainName: trainName,
            customerEmail: email || null,
            items: formattedItems,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        alert(data.message || "Order placement failed on backend database.");
        return;
      }

      const targetOrderId = data.orderId || data.OrderId;

      if (!targetOrderId) {
        alert("Order completed, but unique transaction tracker ID is missing.");
        router.push("/order-success");
        return;
      }

      router.push(`/order-success?orderId=${targetOrderId}`);

      setTimeout(() => {
        clearCart();
      }, 400);

    } catch (e) {
      console.error(e);
      alert("Network or Server script runtime error.");
    }
  };

  return (
    <div className="mx-auto h-screen w-full max-w-[640px] flex flex-col bg-slate-50 px-2 pt-4 pb-[150px]">
      {/* SCROLL AREA */}
      <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
        
        {/* 1. JOURNEY + PASSENGER DETAILS */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          {/* HEADER */}
          <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3 mb-4">
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-[16px] text-slate-800 tracking-tight flex items-center gap-1.5">
                <span className="w-2 h-4 bg-amber-500 rounded-full inline-block"></span>
                Journey Details
              </h2>
              
              {/* Train Name & Number */}
              <div className="mt-2.5 font-bold text-[15px] text-slate-800 truncate flex items-center gap-1.5">
                <span>🚆</span>
                <span className="tracking-tight">
                  {trainName} {trainNumber ? `(${trainNumber})` : ""}
                </span>
              </div>

              {/* Station Name & Code */}
              <div className="text-sm font-medium text-slate-500 mt-1.5 flex items-center gap-1.5 truncate">
                <span>📍</span>
                <span>
                  {stationName} {stationCode ? `(${stationCode})` : ""}
                </span>
              </div>
            </div>

            {/* RIGHT DATETIME & RESTAURANT */}
            <div className="text-right text-xs font-semibold text-slate-600 shrink-0 bg-slate-50/80 p-2.5 rounded-lg space-y-1 min-w-[105px]">
              <div className="flex items-center justify-end gap-1">
                <span>📅</span>
                <span>{deliveryDate}</span>
              </div>
              <div className="flex items-center justify-end gap-1">
                <span>⏰</span>
                <span>{deliveryTime}</span>
              </div>
              <div className="text-xs font-bold text-amber-600 truncate max-w-[125px] mt-1 pt-1 border-t border-slate-200">
                🎪 {vendorName}
              </div>
            </div>
          </div>

          {/* INPUT FORM */}
          <div className="space-y-3 text-[14px]">
            {/* NAME + MOBILE */}
            <div className="flex items-center gap-2.5">
              <input
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none bg-slate-100/70 text-slate-500 font-medium cursor-not-allowed flex-1 min-w-0"
                placeholder="Passenger Name"
                value={name}
                readOnly
              />
              <input
                className="border border-slate-200 rounded-lg px-2 py-2.5 text-[14px] focus:outline-none bg-slate-100/70 text-slate-500 font-medium cursor-not-allowed w-[110px] shrink-0 text-center"
                placeholder="Mobile"
                value={mobile}
                maxLength={10}
                readOnly
              />
            </div>

            {/* EMAIL + PNR */}
<div className="flex items-center gap-2.5">
  <input
    className="border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none bg-slate-100/70 text-slate-500 font-medium cursor-not-allowed flex-1 min-w-0"
    placeholder="Email ID"
    value={email}
    readOnly
  />

  <input
    className={`border border-slate-200 rounded-lg px-2 py-2.5 text-[14px] font-bold tracking-wide text-slate-700 w-[110px] shrink-0 text-center ${
      isPnrLocked
        ? "bg-slate-100 cursor-not-allowed"
        : "bg-slate-50/50 focus:outline-none focus:border-amber-500"
    }`}
    placeholder="10-Digit PNR"
    value={pnr}
    maxLength={10}
    readOnly={isPnrLocked}
    onChange={(e) => setPnr(e.target.value)}
  />
</div>

{pnrError ? (
  <div className="text-[11px] font-bold text-red-600 pl-1">
    {pnrError}
  </div>
) : null}
            {/* LAST ROW: COACH + SEAT + PROMO */}
            <div className="flex items-center gap-2 w-full">
              <input
  className={`border border-slate-200 rounded-lg py-2.5 text-[14px] text-center w-[62px] shrink-0 font-semibold ${
    coach
      ? "bg-slate-100 text-slate-700 cursor-not-allowed"
      : "bg-slate-50/50 focus:outline-none focus:border-amber-500"
  }`}
  placeholder="Coach"
  value={coach}
  readOnly={!!coach}
  onChange={(e) => setCoach(e.target.value)}
/>
              <input
  className={`border border-slate-200 rounded-lg py-2.5 text-[14px] text-center w-[55px] shrink-0 font-semibold ${
    seat
      ? "bg-slate-100 text-slate-700 cursor-not-allowed"
      : "bg-slate-50/50 focus:outline-none focus:border-amber-500"
  }`}
  placeholder="Seat"
  value={seat}
  readOnly={!!seat}
  onChange={(e) => setSeat(e.target.value)}
/>
              <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50/50 flex-1 min-w-0 focus-within:border-amber-500 overflow-hidden">
                <input
                  className="px-2.5 py-2.5 text-[14px] bg-transparent focus:outline-none uppercase w-full min-w-0 font-semibold tracking-wider"
                  placeholder="PROMO"
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                />
                <button className="bg-slate-900 text-xs font-bold text-white px-3 py-3 h-full transition hover:bg-slate-800 active:scale-95 shrink-0 border-l border-slate-200 uppercase">
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. YOUR ORDER CARD */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-[16px] text-slate-800 tracking-tight flex items-center gap-1.5">
              <span className="w-2 h-4 bg-amber-500 rounded-full inline-block"></span>
              Your Order
            </h2>
          </div>

          {/* ITEM ROWS */}
          <div className="max-h-[190px] overflow-y-auto divide-y divide-slate-100 px-4">
            {cartItems.map((i) => (
              <div key={i.id} className="flex justify-between items-center py-3 gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-slate-700 truncate">
                    {i.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-medium">
                    ₹{i.price} × {i.qty}
                  </div>
                </div>
                <div className="font-bold text-sm text-slate-800 whitespace-nowrap">
                  ₹{i.price * i.qty}
                </div>
              </div>
            ))}
          </div>

          {/* FINAL BREAKDOWN SUMMARY */}
          <div className="border-t border-slate-100 p-4 bg-slate-50/40 space-y-2.5 border-dashed">
            <Row label="Subtotal" value={subtotal} />
            <Row label="GST (5%)" value={gst} />
            <Row label="Delivery Charges" value={delivery} />
            
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 border-solid mt-1">
              <span className="font-bold text-sm text-slate-800">Grand Total</span>
              <span className="font-extrabold text-[17px] text-slate-900">₹{total}</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. FIXED PAYMENT BOTTOM BAR */}
      <div className="fixed bottom-[56px] left-0 right-0 bg-white border-t border-slate-100 shadow-[0_-4px_25px_rgba(0,0,0,0.05)] z-40">
        <div className="mx-auto w-full max-w-[640px] px-2 py-4">
          
          {/* PAYMENT MODE SELECTOR */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setPaymentMode("COD")}
                className={`rounded-md px-3.5 py-2 text-xs font-bold transition-all ${
                  paymentMode === "COD"
                    ? "bg-green-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Cash on Delivery
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode("ONLINE")}
                className={`rounded-md px-3.5 py-2 text-xs font-bold transition-all ${
                  paymentMode === "ONLINE"
                    ? "bg-green-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Prepaid (Online)
              </button>
            </div>

            {/* CORNER QUICK BILL DISPLAY */}
            <div className="text-right min-w-[75px] shrink-0 pl-1">
              <div className="text-[19px] font-extrabold text-slate-900 leading-none whitespace-nowrap">
                ₹{total}
              </div>
              <div className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                To Pay
              </div>
            </div>
          </div>

          {/* PRIMARY ACTION BUTTON */}
          <button
  type="button"
  onClick={placeOrder}
  disabled={!isOrderReady}
  className={`w-full text-white font-extrabold py-3 rounded-lg text-[15px] transition-all tracking-wide uppercase ${
    isOrderReady
      ? "bg-green-600 hover:bg-green-700 active:scale-[0.98] shadow-md shadow-green-600/10"
      : "bg-slate-300 cursor-not-allowed"
  }`}
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
    <div className="flex justify-between text-xs font-medium text-slate-500">
      <span>{label}</span>
      <span className="font-semibold text-slate-700">₹{value}</span>
    </div>
  );
}
