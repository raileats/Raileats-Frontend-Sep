"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../lib/useAuth";
import { useCart } from "../lib/useCart";

export default function LoginModal() {
  const { setUser } = useAuth();
  const { add } = useCart();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"mobile" | "otp">("mobile");

  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");

  const [pendingItem, setPendingItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  /* 🔥 OPEN LOGIN MODAL */
  useEffect(() => {
    const handler = (e: any) => {
      setOpen(true);
      setPendingItem(e.detail?.item || null);
      setStep("mobile");
    };

    window.addEventListener("raileats:open-login", handler);
    return () =>
      window.removeEventListener("raileats:open-login", handler);
  }, []);

  /* ================= SEND OTP ================= */
  const sendOtp = async () => {
    if (!mobile) return alert("Enter mobile");

    try {
      setLoading(true);

      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: "+91" + mobile }),
      });

      const json = await res.json();

      if (!json.success) {
        alert("OTP send failed");
        return;
      }

      alert("OTP: " + json.otp); // testing
      setStep("otp");

    } catch (err) {
      console.log(err);
      alert("Error sending OTP");
    } finally {
      setLoading(false);
    }
  };

  /* ================= VERIFY OTP ================= */
  const verifyOtp = async () => {
    if (!otp) return alert("Enter OTP");

    try {
      setLoading(true);

      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: "+91" + mobile, otp }),
      });

      const json = await res.json();

      if (!json.success) {
        alert("Wrong OTP");
        return;
      }

      // 🔥 DIRECT LOGIN COMPLETE
      const user = {
        mobile,
        name: "User",
        email: "",
      };

      // ✅ GLOBAL STATE
      setUser(user);

      // ✅ LOCAL STORAGE (persist login)
      localStorage.setItem("raileats_user", JSON.stringify(user));

      // 🔥 AUTO ADD ITEM AFTER LOGIN
      if (pendingItem) {
        add({
          id: pendingItem.id,
          name: pendingItem.item_name,
          price: pendingItem.base_price,
          qty: 1,
        });
      }

      // 🔥 CLOSE MODAL
      setOpen(false);

    } catch (err) {
      console.log(err);
      alert("Error verifying OTP");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg w-80 space-y-3">

        {/* MOBILE STEP */}
        {step === "mobile" && (
          <>
            <input
              placeholder="Enter Mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="border p-2 w-full"
            />

            <button
              onClick={sendOtp}
              disabled={loading}
              className="bg-blue-600 text-white w-full p-2 rounded"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </>
        )}

        {/* OTP STEP */}
        {step === "otp" && (
          <>
            <input
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="border p-2 w-full"
            />

            <button
              onClick={verifyOtp}
              disabled={loading}
              className="bg-green-600 text-white w-full p-2 rounded"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </>
        )}

      </div>
    </div>
  );
}
