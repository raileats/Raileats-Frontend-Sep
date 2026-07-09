// app/checkout/review/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { priceStr } from "../../lib/priceUtil";

type Draft = {
  id: string;
  items: { id: number; name: string; price: number; qty: number }[];
  count: number;
  subtotal: number;
  journey: {
    trainNo: string;
    deliveryDate: string;
    deliveryTime: string;
    pnr: string;
    coach: string;
    seat: string;
    name: string;
    mobile: string;
  };
  outlet: {
    stationCode: string;
    stationName?: string;
    restroCode: string | number;
    outletName?: string;
  } | null;
  createdAt: number;
};

type CouponResult = {
  ok: boolean;
  code: string;
  discount: number;
  message: string;
};

function validateCoupon(
  rawCode: string,
  subtotal: number,
  itemCount: number,
): CouponResult {
  const code = String(rawCode || "").trim().toUpperCase();

  if (!code) {
    return {
      ok: false,
      code: "",
      discount: 0,
      message: "Please enter coupon code.",
    };
  }

  if (code === "REFOOD30") {
    if (subtotal >= 200 && subtotal < 300) {
      return {
        ok: true,
        code,
        discount: 30,
        message: "Coupon applied: ₹30 discount.",
      };
    }
    return {
      ok: false,
      code,
      discount: 0,
      message: "ReFood30 is valid only on ₹200 to ₹300 order value.",
    };
  }

  if (code === "REFOOD50") {
    if (subtotal >= 300 && subtotal < 600) {
      return {
        ok: true,
        code,
        discount: 50,
        message: "Coupon applied: ₹50 discount.",
      };
    }
    return {
      ok: false,
      code,
      discount: 0,
      message: "ReFood50 is valid only on ₹300 to ₹600 order value.",
    };
  }

  if (code === "REFOOD100") {
    if (subtotal >= 600 && subtotal < 1000) {
      return {
        ok: true,
        code,
        discount: 100,
        message: "Coupon applied: ₹100 discount.",
      };
    }
    return {
      ok: false,
      code,
      discount: 0,
      message: "ReFood100 is valid only on ₹600 to ₹1000 order value.",
    };
  }

  if (code === "REFOOD200") {
    if (subtotal >= 1000) {
      return {
        ok: true,
        code,
        discount: 200,
        message: "Coupon applied: ₹200 discount.",
      };
    }
    return {
      ok: false,
      code,
      discount: 0,
      message: "ReFood200 is valid only on ₹1000+ order value.",
    };
  }

  if (code === "FLAT20") {
    if (itemCount >= 20 && subtotal >= 4000) {
      const discount = Math.round(subtotal * 0.2);
      return {
        ok: true,
        code,
        discount,
        message: "Bulk coupon applied: 20% discount.",
      };
    }
    return {
      ok: false,
      code,
      discount: 0,
      message:
        "FLAT20 is valid only for minimum 20 quantity and ₹4000 order value.",
    };
  }

  return {
    ok: false,
    code,
    discount: 0,
    message: "Invalid coupon code.",
  };
}

export default function ReviewPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);

  const [platformCharge, setPlatformCharge] = useState<number>(20);
  const gstPercent = 5;
  const [mode, setMode] = useState<"cod" | "online">("cod");
  const [booking, setBooking] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponOk, setCouponOk] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("raileats_order_draft");
    if (!raw) {
      router.replace("/checkout");
      return;
    }
    try {
      const d = JSON.parse(raw) as Draft;
      setDraft(d);
    } catch (e) {
      console.error("Invalid draft in sessionStorage", e);
      router.replace("/checkout");
    }
  }, [router]);

  if (!draft)
    return (
      <main className="site-container page-safe-bottom card-safe">
        Loading…
      </main>
    );

  const subtotal = Number(draft.subtotal || 0);
  const itemCount = Number(draft.count || 0);
  const safeCouponDiscount = Math.min(Number(couponDiscount || 0), subtotal);
  const taxableAmount = Math.max(0, subtotal - safeCouponDiscount);
  const gst = +(taxableAmount * (gstPercent / 100));
  const final = +(
    taxableAmount +
    gst +
    Number(platformCharge || 0)
  );

  const applyCoupon = () => {
    const result = validateCoupon(couponInput, subtotal, itemCount);
    setCouponMessage(result.message);
    setCouponOk(result.ok);

    if (result.ok) {
      setCouponCode(result.code);
      setCouponDiscount(result.discount);
      setCouponInput(result.code);
    } else {
      setCouponCode("");
      setCouponDiscount(0);
    }
  };

  const removeCoupon = () => {
    setCouponInput("");
    setCouponCode("");
    setCouponDiscount(0);
    setCouponMessage("");
    setCouponOk(false);
  };

  const placeCodOrder = async () => {
    if (booking) return;
    setBooking(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMode: "COD",
          draft,
          couponCode,
          couponDiscount: safeCouponDiscount,
          pricing: {
            subtotal,
            couponCode,
            couponDiscount: safeCouponDiscount,
            gst,
            platformCharge,
            total: final,
          },
        }),
      });

      const json = await res.json().catch(() => null as any);

      if (!res.ok || !json?.ok) {
        console.error("Order create failed", json);
        alert("Order booking failed. Please try again.");
        return;
      }

      const orderId: string =
        json.orderId ||
        json.order?.OrderId ||
        `ORD${Date.now()}`;

      const orderForSummary = {
        id: orderId,
        items: draft.items,
        journey: draft.journey,
        subtotal,
        couponCode,
        couponDiscount: safeCouponDiscount,
        gst,
        platformCharge,
        total: final,
        paymentMode: "COD",
        createdAt: Date.now(),
      };

      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "raileats_last_order",
          JSON.stringify(orderForSummary),
        );
        sessionStorage.removeItem("raileats_order_draft");
      }

      router.push("/checkout/summary");
    } catch (e) {
      console.error("placeCodOrder error", e);
      alert("Order booking failed. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  const gotoPayOnline = () => {
    const payload = {
      draft,
      platformCharge,
      gstPercent,
      couponCode,
      couponDiscount: safeCouponDiscount,
      gst,
      final,
    };
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "raileats_payment_payload",
        JSON.stringify(payload),
      );
    }
    router.push("/checkout/payment");
  };

  return (
    <main className="site-container page-safe-bottom">
      <h1 className="text-2xl font-bold mb-2">Review Order</h1>

      <div className="card-safe mb-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-sm text-gray-600">To</div>
            <div className="font-medium">{draft.journey.name}</div>
            <div className="text-xs text-gray-500">
              {draft.journey.pnr} • Coach {draft.journey.coach} • Seat{" "}
              {draft.journey.seat}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-600">Items</div>
            <div className="font-medium">{draft.count}</div>
          </div>
        </div>
      </div>

      <div className="card-safe mb-4">
        <h3 className="font-semibold mb-2">Apply Coupon</h3>

        <div className="flex gap-2">
          <input
            type="text"
            value={couponInput}
            onChange={(e) => {
              setCouponInput(e.target.value.toUpperCase());
              setCouponMessage("");
              setCouponOk(false);
            }}
            placeholder="Enter coupon code"
            className="input"
            disabled={!!couponCode}
          />

          {couponCode ? (
            <button
              type="button"
              onClick={removeCoupon}
              className="rounded border px-4 py-2"
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={applyCoupon}
              className="rounded px-4 py-2 bg-orange-600 text-white"
            >
              Apply
            </button>
          )}
        </div>

        {couponMessage ? (
          <div
            className={`mt-2 text-sm ${
              couponOk ? "text-green-600" : "text-red-600"
            }`}
          >
            {couponMessage}
          </div>
        ) : null}

        <div className="mt-3 text-xs text-gray-500">
          Coupons: ReFood30, ReFood50, ReFood100, ReFood200, FLAT20
        </div>
      </div>

      <div className="card-safe mb-4">
        <h3 className="font-semibold mb-2">Price details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <div>Base price</div>
            <div>{priceStr(subtotal)}</div>
          </div>

          {safeCouponDiscount > 0 ? (
            <div className="flex justify-between text-green-600">
              <div>Coupon Discount ({couponCode})</div>
              <div>-{priceStr(safeCouponDiscount)}</div>
            </div>
          ) : null}

          <div className="flex justify-between">
            <div>GST ({gstPercent}%)</div>
            <div>{priceStr(gst)}</div>
          </div>
          <div className="flex justify-between items-center">
            <div>Platform / delivery</div>
            <div>
              <input
                type="number"
                value={platformCharge}
                onChange={(e) => setPlatformCharge(Number(e.target.value || 0))}
                className="input"
                style={{ width: 110 }}
              />
            </div>
          </div>
          <div className="pt-2 border-t flex justify-between font-semibold">
            <div>Total</div>
            <div>{priceStr(final)}</div>
          </div>
        </div>
      </div>

      <div className="card-safe mb-4">
        <h3 className="font-semibold mb-2">Payment</h3>

        <label className="flex items-center gap-2 mb-2">
          <input
            type="radio"
            checked={mode === "cod"}
            onChange={() => setMode("cod")}
          />
          <span>Cash on delivery (COD)</span>
        </label>

        <label className="flex items-center gap-2 mb-2">
          <input
            type="radio"
            checked={mode === "online"}
            onChange={() => setMode("online")}
          />
          <span>Pay Online</span>
        </label>

        {mode === "cod" ? (
          <div className="mt-3 flex gap-3">
            <button
              className="rounded px-4 py-2 bg-green-600 text-white"
              onClick={placeCodOrder}
              disabled={booking}
            >
              {booking ? "Booking…" : "Book"}
            </button>
            <button
              className="rounded border px-4 py-2"
              onClick={() => router.back()}
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="mt-3 flex gap-3">
            <button
              className="rounded px-4 py-2 bg-blue-600 text-white"
              onClick={gotoPayOnline}
            >
              Pay now
            </button>
            <button
              className="rounded border px-4 py-2"
              onClick={() => router.back()}
            >
              Edit
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
