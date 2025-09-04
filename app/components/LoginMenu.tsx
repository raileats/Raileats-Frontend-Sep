"use client";
import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

type User = { name: string; phone: string; email?: string };

export default function LoginMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showOtp, setShowOtp] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("raileats_user");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  const logout = () => {
    localStorage.removeItem("raileats_user");
    setUser(null);
    setOpen(false);
  };

  return (
    <>
      {!user ? (
        <button
          onClick={() => setShowOtp(true)}
          className="rounded-md bg-yellow-600 px-5 py-2 text-white hover:bg-yellow-700 transition"
        >
          Login
        </button>
      ) : (
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-gray-50"
          >
            <span className="font-medium">{user.name}</span>
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
              <a href="/wallet" className="block px-3 py-2 hover:bg-gray-50">
                My Wallet
              </a>
              <button
                onClick={logout}
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
          onLoggedIn={(u) => setUser(u)}
        />
      )}
    </>
  );
}

/* ---------- OTP modal (demo OTP: 111111) ---------- */
function OTPLoginModal({
  onClose,
  onLoggedIn,
}: {
  onClose: () => void;
  onLoggedIn: (u: { name: string; phone: string; email?: string }) => void;
}) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const sendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Valid 10-digit phone required");
    setError("");
    setStep("otp"); // mock send
  };

  const verifyOtp = async () => {
    if (otp === "111111") {
      const u = { name: "RailEater", phone };
      localStorage.setItem("raileats_user", JSON.stringify(u));
      onLoggedIn(u);
      onClose();
    } else {
      setError("Invalid OTP");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50">
      {/* slightly down from top + smaller on mobile/desktop */}
      <div className="mx-auto mt-10 md:mt-16 max-w-xs md:max-w-sm">
        <div className="rounded-xl bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base md:text-lg font-semibold">OTP Login</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-black text-lg leading-none">
              ✕
            </button>
          </div>

          {step === "phone" ? (
            <>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
