"use client";

import { useState } from "react";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);

  /* ================= SEND OTP ================= */
  const sendOtp = async (e: any) => {
    e.preventDefault();

    if (!phone) return alert("Enter mobile number");

    try {
      setLoading(true);

      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: "+91" + phone,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert("Error: " + data.error);
        return;
      }

      // 🔥 TESTING: OTP दिखेगा
      alert("OTP: " + data.otp);

      setStep("otp");

    } catch (err) {
      console.log(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  /* ================= VERIFY OTP ================= */
  const verifyOtp = async (e: any) => {
    e.preventDefault();

    try {
      setLoading(true);

      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: "+91" + phone,
          otp,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert("Invalid OTP ❌");
        return;
      }

      alert("Login success ✅");

    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-sm mx-auto">

      {/* PHONE STEP */}
      {step === "phone" && (
        <form onSubmit={sendOtp} className="space-y-3">

          <input
            type="tel"
            placeholder="Enter mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="border p-2 w-full"
          />

          <button
            type="submit"
            className="bg-orange-500 text-white px-4 py-2 w-full"
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </form>
      )}

      {/* OTP STEP */}
      {step === "otp" && (
        <form onSubmit={verifyOtp} className="space-y-3">

          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="border p-2 w-full"
          />

          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 w-full"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>
      )}

    </div>
  );
}
