"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../lib/useAuth";
import { useCart } from "../lib/useCart";

export default function LoginModal() {
  const { setUser } = useAuth();
  const { add } = useCart();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"mobile" | "otp" | "profile">("mobile");

  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [pendingItem, setPendingItem] = useState<any>(null);

  /* 🔥 LISTEN EVENT */
  useEffect(() => {
    const handler = (e: any) => {
      setOpen(true);
      setPendingItem(e.detail?.item || null);
    };

    window.addEventListener("raileats:open-login", handler);
    return () =>
      window.removeEventListener("raileats:open-login", handler);
  }, []);

  /* 🔥 SEND OTP (mock for now) */
  const sendOtp = () => {
    if (!mobile) return alert("Enter mobile");
    setStep("otp");
  };

  /* 🔥 VERIFY OTP (mock success) */
  const verifyOtp = () => {
    // 👉 यहाँ बाद में Supabase OTP लगेगा
    const isNewUser = true;

    if (isNewUser) {
      setStep("profile");
    } else {
      completeLogin({ name: "User", email: "" });
    }
  };

  /* 🔥 FINAL LOGIN */
  const completeLogin = (data: any) => {
    const user = { mobile, ...data };

    setUser(user);
    setOpen(false);

    // 🔥 CONTINUE CART
    if (pendingItem) {
      add({
        id: pendingItem.id,
        name: pendingItem.item_name,
        price: pendingItem.base_price,
        qty: 1,
      });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg w-80 space-y-3">

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
              className="bg-blue-600 text-white w-full p-2 rounded"
            >
              Send OTP
            </button>
          </>
        )}

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
              className="bg-green-600 text-white w-full p-2 rounded"
            >
              Verify OTP
            </button>
          </>
        )}

        {step === "profile" && (
          <>
            <input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border p-2 w-full"
            />
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border p-2 w-full"
            />

            <button
              onClick={() => completeLogin({ name, email })}
              className="bg-orange-600 text-white w-full p-2 rounded"
            >
              Continue
            </button>
          </>
        )}

      </div>
    </div>
  );
}