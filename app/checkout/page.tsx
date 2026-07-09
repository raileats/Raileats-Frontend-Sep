"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/lib/useCart";
import { useAuth } from "@/lib/useAuth";

type AgentInfo = {
  active: boolean;
  name?: string;
  mobile?: string;
};

function detectClientBookingSource() {
  if (typeof navigator === "undefined") return "Desktop";

  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const isAndroid = /Android/i.test(ua);
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isMac = /Mac/i.test(platform) || /Macintosh|Mac OS X/i.test(ua);
  const isWindows = /Windows/i.test(ua);
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);
  const isAndroidWebView =
    isAndroid &&
    (/; wv/i.test(ua) ||
      /Version\/4\.0/i.test(ua) ||
      /RailEatsApp|RailEats-Android/i.test(ua));

  if (isAndroidWebView) return "App";
  if (isAndroid) return "Mobile Web";
  if (isIos) return "IOS";
  if (isMac && !isMobile) return "Mac";
  if (isWindows) return "Desktop";

  return isMobile ? "Mobile Web" : "Desktop";
}

function normalizeMobile(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) return digits.slice(-10);
  return digits.slice(-10);
}

function getCouponDiscount(code: string, subtotal: number, totalQty: number) {
  const c = String(code || "").trim().toUpperCase();

  if (!c) return { ok: false, code: "", discount: 0, message: "" };

  if (c === "REFOOD30") {
    if (subtotal >= 200 && subtotal < 300) {
      return { ok: true, code: c, discount: 30, message: "ReFood30 applied ₹30 discount" };
    }
    return { ok: false, code: c, discount: 0, message: "ReFood30 only valid for ₹200 to ₹300 order" };
  }

  if (c === "REFOOD50") {
    if (subtotal >= 300 && subtotal < 600) {
      return { ok: true, code: c, discount: 50, message: "ReFood50 applied ₹50 discount" };
    }
    return { ok: false, code: c, discount: 0, message: "ReFood50 only valid for ₹300 to ₹600 order" };
  }

  if (c === "REFOOD100") {
    if (subtotal >= 600 && subtotal < 1000) {
      return { ok: true, code: c, discount: 100, message: "ReFood100 applied ₹100 discount" };
    }
    return { ok: false, code: c, discount: 0, message: "ReFood100 only valid for ₹600 to ₹1000 order" };
  }

  if (c === "REFOOD200") {
    if (subtotal >= 1000) {
      return { ok: true, code: c, discount: 200, message: "ReFood200 applied ₹200 discount" };
    }
    return { ok: false, code: c, discount: 0, message: "ReFood200 only valid for ₹1000+ order" };
  }

  if (c === "FLAT20") {
    if (totalQty >= 20 && subtotal >= 4000) {
      const discount = Math.round(subtotal * 0.2);
      return { ok: true, code: c, discount, message: "FLAT20 applied 20% discount" };
    }
    return {
      ok: false,
      code: c,
      discount: 0,
      message: "FLAT20 needs minimum 20 quantity and ₹4000 order value",
    };
  }

  return { ok: false, code: c, discount: 0, message: "Invalid coupon code" };
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { items, clearCart, journey } = useCart();
  const cartItems = Array.isArray(items) ? items : [];
  const { user, loadUser } = useAuth();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  const [pnr, setPnr] = useState("");
  const [pnrError, setPnrError] = useState("");
  const [coach, setCoach] = useState("");
  const [seat, setSeat] = useState("");
  const [isPnrLocked, setIsPnrLocked] = useState(false);
  const [isPnrVerified, setIsPnrVerified] = useState(false);
  const [promo, setPromo] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponOk, setCouponOk] = useState(false);

  const [agentInfo, setAgentInfo] = useState<AgentInfo>({ active: false });
  const [manualDeliveryDate, setManualDeliveryDate] = useState("");
  const [manualDeliveryTime, setManualDeliveryTime] = useState("");

  const [paymentMode, setPaymentMode] = useState("COD");
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");

      let rawMobile = user.mobile || "";
      if (rawMobile.startsWith("+91")) {
        rawMobile = rawMobile.replace("+91", "").trim();
      } else if (rawMobile.length > 10 && rawMobile.startsWith("91")) {
        rawMobile = rawMobile.substring(2);
      }
      setMobile(rawMobile);
    }
  }, [user]);

  const firstCartItem = cartItems[0] as any;

  const trainName = journey?.trainName || firstCartItem?.trainName || "N/A";
  const trainNumber = journey?.trainNumber || firstCartItem?.trainNumber || "";
  const stationName =
    journey?.stationName ||
    firstCartItem?.station_name ||
    firstCartItem?.stationName ||
    "N/A";

  const stationCode =
    journey?.stationCode ||
    firstCartItem?.station_code ||
    firstCartItem?.stationCode ||
    "";

  const baseDeliveryDate =
    journey?.deliveryDate || firstCartItem?.deliveryDate || "N/A";

  const baseDeliveryTime =
    journey?.deliveryTime || firstCartItem?.deliveryTime || "N/A";

  const vendorName =
    journey?.vendorName ||
    firstCartItem?.vendorName ||
    firstCartItem?.restro_name ||
    "N/A";

  const isAgentActive = !!agentInfo.active;

  const deliveryDate =
    isAgentActive && manualDeliveryDate ? manualDeliveryDate : baseDeliveryDate;

  const deliveryTime =
    isAgentActive && manualDeliveryTime ? manualDeliveryTime : baseDeliveryTime;

  useEffect(() => {
    if (baseDeliveryDate && baseDeliveryDate !== "N/A") {
      setManualDeliveryDate(baseDeliveryDate);
    }
  }, [baseDeliveryDate]);

  useEffect(() => {
    if (baseDeliveryTime && baseDeliveryTime !== "N/A") {
      setManualDeliveryTime(String(baseDeliveryTime).slice(0, 5));
    }
  }, [baseDeliveryTime]);

  useEffect(() => {
    const cleanMobile = normalizeMobile(mobile);

    if (!cleanMobile) {
      setAgentInfo({ active: false });
      return;
    }

    let ignore = false;

    async function loadAgentStatus() {
      try {
        const res = await fetch(
          `/api/customer/agent-status?mobile=${encodeURIComponent(cleanMobile)}`,
          { cache: "no-store" }
        );
        const data = await res.json().catch(() => null);

        if (ignore) return;

        setAgentInfo({
          active: !!data?.active,
          name: data?.name || name || user?.name || "",
          mobile: cleanMobile,
        });
      } catch {
        if (!ignore) setAgentInfo({ active: false });
      }
    }

    loadAgentStatus();

    return () => {
      ignore = true;
    };
  }, [mobile, name, user?.name]);

  useEffect(() => {
    try {
      const urlPnr = searchParams.get("pnr") || "";
      const cartPnr = String(firstCartItem?.pnr || "");

      const saved =
        typeof window !== "undefined"
          ? localStorage.getItem("raileats_pnr_details")
          : null;

      let savedPnr = "";
      let savedCoach = "";
      let savedSeat = "";
      let savedTrainNo = "";

      if (saved) {
        const parsed = JSON.parse(saved);
        savedPnr = String(parsed?.pnr || "");
        savedCoach = String(parsed?.coach || "");
        savedSeat = String(parsed?.berth || "");
        savedTrainNo = String(parsed?.trainNo || parsed?.trainNumber || "");
      }

      const finalPnr =
        urlPnr ||
        cartPnr ||
        (savedTrainNo && trainNumber && savedTrainNo === String(trainNumber)
          ? savedPnr
          : "");

      if (!finalPnr) {
        setPnr("");
        setCoach("");
        setSeat("");
        setIsPnrLocked(false);
        setIsPnrVerified(false);
        return;
      }

      setPnr(finalPnr);

      if (savedPnr === finalPnr) {
        setCoach(savedCoach);
        setSeat(savedSeat);
        setIsPnrLocked(true);
        setIsPnrVerified(!!savedCoach && !!savedSeat);
        setPnrError("");
      }
    } catch (e) {
      console.error("PNR preload failed", e);
    }
  }, [searchParams, firstCartItem?.pnr, trainNumber]);

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
      if (!pnr || (!isAgentActive && pnr.length !== 10)) {
        setPnrError("");
        setIsPnrVerified(false);
        return;
      }

      if (isAgentActive && pnr.length !== 10) {
        setPnrError("");
        setIsPnrLocked(false);
        setIsPnrVerified(!!String(pnr || "").trim());
        return;
      }

      try {
        const res = await fetch(`/api/pnr/${encodeURIComponent(pnr)}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!data?.ok) {
          if (isAgentActive) {
            setPnrError("");
            setIsPnrLocked(false);
            setIsPnrVerified(!!String(pnr || "").trim());
            return;
          }

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

        if (
          isAgentActive &&
          pnrJourneyDate &&
          (!manualDeliveryDate || manualDeliveryDate === "N/A")
        ) {
          setManualDeliveryDate(pnrJourneyDate);
        }

        const currentTrainNo = String(trainNumber || "");

        if (
          !isAgentActive &&
          currentTrainNo &&
          pnrTrainNo &&
          pnrTrainNo !== currentTrainNo
        ) {
          setPnrError("PNR not belongs to booking train");
          setCoach("");
          setSeat("");
          setIsPnrVerified(false);
          setIsPnrLocked(false);
          return;
        }

        if (!pnrTrainNo || !pnrJourneyDate || !pnrBoarding) {
          if (isAgentActive) {
            setPnrError("");
            setIsPnrLocked(false);
            setIsPnrVerified(!!String(pnr || "").trim());
            return;
          }

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

        if (
          isAgentActive &&
          matchedStation?.date &&
          (!manualDeliveryDate || manualDeliveryDate === "N/A")
        ) {
          setManualDeliveryDate(formatDateForTrainPage(matchedStation.date));
        }

        if (!matchedStation) {
          if (isAgentActive) {
            setPnrError("");
            setIsPnrLocked(false);
            setIsPnrVerified(!!String(pnr || "").trim());
          } else {
            setPnrError("PNR route does not match delivery station");
            setCoach("");
            setSeat("");
            setIsPnrVerified(false);
            setIsPnrLocked(false);
            return;
          }
        }

        if (
          matchedStation &&
          !isAgentActive &&
          normalizeDate(matchedStation.date) !== normalizeDate(deliveryDate)
        ) {
          setPnrError("Date mismatch");
          setCoach("");
          setSeat("");
          setIsPnrVerified(false);
          setIsPnrLocked(false);
          return;
        }

        const passenger = data.passengers?.[0] || data.raw?.passengerList?.[0] || {};

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
        if (fetchedCoach && (!isAgentActive || !coach)) {
          setCoach(String(fetchedCoach || ""));
        }
        if (fetchedSeat && (!isAgentActive || !seat)) {
          setSeat(String(fetchedSeat || ""));
        }
        setIsPnrLocked(!isAgentActive);
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
        if (isAgentActive) {
          setPnrError("");
          setIsPnrLocked(false);
          setIsPnrVerified(!!String(pnr || "").trim());
          console.error("Agent PNR soft fetch failed", e);
          return;
        }

        setPnrError("PNR fetch failed");
        setCoach("");
        setSeat("");
        setIsPnrVerified(false);
        setIsPnrLocked(false);
        console.error("PNR fetch failed", e);
      }
    }

    fetchPnrDetails();
  }, [
    pnr,
    trainNumber,
    stationCode,
    deliveryDate,
    isAgentActive,
    manualDeliveryDate,
    coach,
    seat,
  ]);

  const subtotal = cartItems.reduce(
    (sum, i) => sum + Number(i.price) * Number(i.qty),
    0
  );

  const totalQty = cartItems.reduce((sum, i) => sum + Number(i.qty || 0), 0);
  const safeCouponDiscount = Math.min(Number(couponDiscount || 0), subtotal);
  const taxableAmount = Math.max(0, subtotal - safeCouponDiscount);
  const gst = Math.round(taxableAmount * 0.05);
  const delivery = subtotal > 0 ? 20 : 0;
  const total = taxableAmount + gst + delivery;

  const isOrderReady =
    !!name &&
    !!mobile &&
    !!trainNumber &&
    !!deliveryDate &&
    deliveryDate !== "N/A" &&
    !!deliveryTime &&
    deliveryTime !== "N/A" &&
    !!String(pnr || "").trim() &&
    !!coach &&
    !!seat &&
    (isAgentActive || isPnrVerified) &&
    !pnrError &&
    cartItems.length > 0;

  const applyPromo = () => {
    const result = getCouponDiscount(promo, subtotal, totalQty);
    setCouponMessage(result.message);
    setCouponOk(result.ok);

    if (result.ok) {
      setAppliedCoupon(result.code);
      setCouponDiscount(result.discount);
      setPromo(result.code);
    } else {
      setAppliedCoupon("");
      setCouponDiscount(0);
    }
  };

  const removePromo = () => {
    setPromo("");
    setAppliedCoupon("");
    setCouponDiscount(0);
    setCouponMessage("");
    setCouponOk(false);
  };

  const placeOrder = async () => {
    if (paymentMode === "ONLINE") {
      setShowPaymentPopup(true);
      return;
    }

    if (!cartItems.length) {
      alert("Cart empty");
      return;
    }

    if (!mobile) {
      alert("Mobile required");
      return;
    }

    const firstItem = cartItems[0];
    const finalStationCode =
      stationCode && stationCode !== "N/A"
        ? stationCode
        : String(firstItem?.station_code || "");

    const finalStationName =
      stationName && stationName !== "N/A"
        ? stationName
        : String(firstItem?.station_name || "");

    const rawRestroCode = journey?.restroCode || firstItem?.restro_code;
    const cleanRestroCode = rawRestroCode
      ? parseInt(rawRestroCode.toString(), 10)
      : 0;

    try {
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
          gst_percent: i.gst_percent || 5.0,
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
          RestroName:
            vendorName !== "N/A" ? vendorName : firstItem?.restro_name || "N/A",
          StationCode: finalStationCode || "N/A",
          StationName: finalStationName || "N/A",
          DeliveryDate: deliveryDate,
          DeliveryTime: deliveryTime,
          TrainNumber: trainNumber || "N/A",
          Coach: coach || null,
          Seat: seat || null,
          CustomerName: name || "Guest",
          CustomerMobile: mobile,
          BookingSource: detectClientBookingSource(),
          BookedBy: isAgentActive
            ? `${name || user?.name || mobile || "Customer"} Agent`
            : name || user?.name || "Customer",
          IsAgentOrder: isAgentActive,
          SubTotal: subtotal,
          CouponCode: appliedCoupon || null,
          CouponDiscount: safeCouponDiscount,
          GSTAmount: gst,
          PlatformCharge: delivery,
          TotalAmount: total,
          PaymentMode: paymentMode,
          Status: "Booked",
          Items: formattedItems,
          JourneyPayload: {
            pnr: pnr || null,
            promoCode: appliedCoupon || promo || null,
            couponCode: appliedCoupon || null,
            couponDiscount: safeCouponDiscount,
            trainName: trainName,
            customerEmail: email || null,
            bookingSource: detectClientBookingSource(),
            bookedBy: isAgentActive
              ? `${name || user?.name || mobile || "Customer"} Agent`
              : name || user?.name || "Customer",
            isAgentOrder: isAgentActive,
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
      {showPaymentPopup && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[360px] p-5 text-center">
            <h2 className="text-lg font-extrabold text-slate-900 mb-2">
              Payment Gateway Not Responding
            </h2>

            <p className="text-sm font-medium text-slate-600 leading-6">
              Payment Gateway is currently not responding.
              <br />
              Please try after some time.
              <br />
              You can also place your order using Cash on Delivery (COD).
            </p>

            <button
              type="button"
              onClick={() => {
                setPaymentMode("COD");
                setShowPaymentPopup(false);
              }}
              className="mt-5 w-full rounded-lg bg-green-600 text-white font-bold py-3"
            >
              Switch to Cash on Delivery
            </button>

            <button
              type="button"
              onClick={() => setShowPaymentPopup(false)}
              className="mt-2 w-full rounded-lg border border-slate-200 text-slate-700 font-bold py-3"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3 mb-4">
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-[16px] text-slate-800 tracking-tight flex items-center gap-1.5">
                <span className="w-2 h-4 bg-amber-500 rounded-full inline-block"></span>
                Journey Details
              </h2>

              <div className="mt-2.5 font-bold text-[15px] text-slate-800 truncate flex items-center gap-1.5">
                <span>🚆</span>
                <span className="tracking-tight">
                  {trainName} {trainNumber ? `(${trainNumber})` : ""}
                </span>
              </div>

              <div className="text-sm font-medium text-slate-500 mt-1.5 flex items-center gap-1.5 truncate">
                <span>📍</span>
                <span>
                  {stationName} {stationCode ? `(${stationCode})` : ""}
                </span>
              </div>
            </div>

            <div className="text-right text-xs font-semibold text-slate-600 shrink-0 bg-slate-50/80 p-2.5 rounded-lg space-y-1 min-w-[105px]">
              {isAgentActive ? (
                <>
                  <label className="block text-left text-[10px] font-black text-slate-500">
                    Delivery Date
                    <input
                      type="date"
                      value={manualDeliveryDate}
                      onChange={(e) => setManualDeliveryDate(e.target.value)}
                      className="mt-1 w-full rounded-md border border-amber-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-800"
                    />
                  </label>
                  <label className="block text-left text-[10px] font-black text-slate-500">
                    Delivery Time
                    <input
                      type="time"
                      value={manualDeliveryTime}
                      onChange={(e) => setManualDeliveryTime(e.target.value)}
                      className="mt-1 w-full rounded-md border border-amber-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-800"
                    />
                  </label>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-end gap-1">
                    <span>📅</span>
                    <span>{deliveryDate}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <span>⏰</span>
                    <span>{deliveryTime}</span>
                  </div>
                </>
              )}
              <div className="text-xs font-bold text-amber-600 truncate max-w-[125px] mt-1 pt-1 border-t border-slate-200">
                🎪 {vendorName}
              </div>
              {isAgentActive ? (
                <div className="rounded-full bg-green-50 px-2 py-1 text-center text-[10px] font-black text-green-700">
                  Agent Active
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 text-[14px]">
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
                maxLength={isAgentActive ? 20 : 10}
                readOnly={!isAgentActive && isPnrLocked}
                onChange={(e) => setPnr(e.target.value)}
              />
            </div>

            {pnrError ? (
              <div className="text-[11px] font-bold text-red-600 pl-1">
                {pnrError}
              </div>
            ) : null}

            <div className="flex items-center gap-2 w-full">
              <input
                className={`border border-slate-200 rounded-lg py-2.5 text-[14px] text-center w-[62px] shrink-0 font-semibold ${
                  coach
                    ? "bg-slate-100 text-slate-700 cursor-not-allowed"
                    : "bg-slate-50/50 focus:outline-none focus:border-amber-500"
                }`}
                placeholder="Coach"
                value={coach}
                readOnly={!isAgentActive && !!coach}
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
                readOnly={!isAgentActive && !!seat}
                onChange={(e) => setSeat(e.target.value)}
              />
              <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50/50 flex-1 min-w-0 focus-within:border-amber-500 overflow-hidden">
                <input
                  className="px-2.5 py-2.5 text-[14px] bg-transparent focus:outline-none uppercase w-full min-w-0 font-semibold tracking-wider"
                  placeholder="PROMO"
                  value={promo}
                  disabled={!!appliedCoupon}
                  onChange={(e) => {
                    setPromo(e.target.value.toUpperCase());
                    setCouponMessage("");
                    setCouponOk(false);
                  }}
                />
                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={removePromo}
                    className="bg-red-600 text-xs font-bold text-white px-3 py-3 h-full transition hover:bg-red-700 active:scale-95 shrink-0 border-l border-slate-200 uppercase"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={applyPromo}
                    className="bg-slate-900 text-xs font-bold text-white px-3 py-3 h-full transition hover:bg-slate-800 active:scale-95 shrink-0 border-l border-slate-200 uppercase"
                  >
                    Apply
                  </button>
                )}
              </div>
            </div>

            {couponMessage ? (
              <div
                className={`text-[11px] font-bold pl-1 ${
                  couponOk ? "text-green-600" : "text-red-600"
                }`}
              >
                {couponMessage}
              </div>
            ) : null}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-[16px] text-slate-800 tracking-tight flex items-center gap-1.5">
              <span className="w-2 h-4 bg-amber-500 rounded-full inline-block"></span>
              Your Order
            </h2>
          </div>

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

          <div className="border-t border-slate-100 p-4 bg-slate-50/40 space-y-2.5 border-dashed">
            <Row label="Subtotal" value={subtotal} />
            {safeCouponDiscount > 0 ? (
              <Row label={`Coupon Discount (${appliedCoupon})`} value={-safeCouponDiscount} />
            ) : null}
            <Row label="GST (5%)" value={gst} />
            <Row label="Delivery Charges" value={delivery} />

            <div className="flex justify-between items-center pt-3 border-t border-slate-200 border-solid mt-1">
              <span className="font-bold text-sm text-slate-800">Grand Total</span>
              <span className="font-extrabold text-[17px] text-slate-900">₹{total}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-[56px] left-0 right-0 bg-white border-t border-slate-100 shadow-[0_-4px_25px_rgba(0,0,0,0.05)] z-40">
        <div className="mx-auto w-full max-w-[640px] px-2 py-4">
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

            <div className="text-right min-w-[75px] shrink-0 pl-1">
              <div className="text-[19px] font-extrabold text-slate-900 leading-none whitespace-nowrap">
                ₹{total}
              </div>
              <div className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                To Pay
              </div>
            </div>
          </div>

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

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-xs font-medium text-slate-500">
      <span>{label}</span>
      <span className="font-semibold text-slate-700">
        {value < 0 ? `-₹${Math.abs(value)}` : `₹${value}`}
      </span>
    </div>
  );
}
