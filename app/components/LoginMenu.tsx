"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "../lib/useAuth"; // 🔥 IMPORTANT

type User = {
  mobile: string;
  name?: string;
  email?: string;
};

export default function LoginMenu() {
  const { user, logout, loadUser } = useAuth(); // ✅ GLOBAL STATE
  const [open, setOpen] = useState(false);
  const [showOtp, setShowOtp] = useState(false);

  /* 🔥 LOAD USER ON START */
  useEffect(() => {
    loadUser();
  }, []);

  return (
    <>
      {!user ? (
        <button
          onClick={() => setShowOtp(true)}
          className="rounded-md bg-white px-5 py-2 text-black font-bold hover:bg-gray-100 transition shadow"
        >
          Login
        </button>
      ) : (
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-black font-bold hover:bg-gray-100 transition shadow"
          >
            <span>{user.name || "User"}</span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 rounded-md border bg-white shadow-lg">
              <a href="/profile" className="block px-3 py-2 hover:bg-gray-50">
                My Profile
              </a>
              <a href="/orders" className="block px-3 py-2 hover:bg-gray-50">
                My Orders
              </a>

              <button
                onClick={() => {
                  logout(); // 🔥 global logout (cart bhi clear karega)
                  window.location.href = "/"; // 🔥 redirect home
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}

      {showOtp && (
        <OTPLoginModal
          onClose={() => setShowOtp(false)}
          onLoggedIn={() => {
            loadUser(); // 🔥 refresh user after login
          }}
        />
      )}
    </>
  );
}

/* ---------- OTP modal ---------- */
function OTPLoginModal({
  onClose,
  onLoggedIn,
}: {
  onClose: () => void;
  onLoggedIn: () => void;
}) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const sendOtp = async () => {
    const res = await fetch("/api/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone: "+91" + phone }),
    });

    const data = await res.json();

    if (!data.success) return alert("OTP failed");

    alert("OTP: " + data.otp);
    setStep("otp");
  };

  const verifyOtp = async () => {
    const res = await fetch("/api/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone: "+91" + phone, otp }),
    });

    const data = await res.json();

    if (!data.success) return alert("Wrong OTP");

    // 🔥 CHECK USER FROM DB
    const userRes = await fetch("/api/get-user", {
      method: "POST",
      body: JSON.stringify({ phone: "+91" + phone }),
    });

    const userData = await userRes.json();

    if (userData.exists) {
      localStorage.setItem(
        "raileats_user",
        JSON.stringify(userData.user)
      );
    } else {
      // NEW USER
      const name = prompt("Enter name");
      const email = prompt("Enter email");

      await fetch("/api/save-user", {
        method: "POST",
        body: JSON.stringify({
          phone: "+91" + phone,
          name,
          email,
        }),
      });

      localStorage.setItem(
        "raileats_user",
        JSON.stringify({
          mobile: "+91" + phone,
          name,
          email,
        })
      );
    }

    onLoggedIn();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white p-4 rounded w-80 space-y-3">
        {step === "phone" ? (
          <>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="border p-2 w-full"
            />
            <button onClick={sendOtp} className="bg-blue-500 text-white w-full p-2">
              Send OTP
            </button>
          </>
        ) : (
          <>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="OTP"
              className="border p-2 w-full"
            />
            <button onClick={verifyOtp} className="bg-green-600 text-white w-full p-2">
              Verify
            </button>
          </>
        )}
      </div>
    </div>
  );
}
