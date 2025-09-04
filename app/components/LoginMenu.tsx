"use client";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

type User = { name: string; phone: string };

export default function LoginMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showOtp, setShowOtp] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("raileats_user");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("raileats_user");
    setUser(null);
    setOpen(false);
  };

  return (
    <>
      {!user ? (
        <button
          onClick={() => setShowOtp(true)}
          className="rounded-md bg-yellow-600 px-4 py-1.5 text-white hover:bg-yellow-700 transition"
        >
          Login
        </button>
      ) : (
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md border px-3 py-1.5 hover:bg-gray-50"
          >
            <span className="font-medium">{user.name}</span>
            <ChevronDown className="h-4 w-4" />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-52 rounded-md border bg-white shadow-lg">
              <a href="/menu#profile" className="block px-3 py-2 hover:bg-gray-50">My Profile</a>
              <a href="/menu#orders" className="block px-3 py-2 hover:bg-gray-50">My Orders</a>
              <a href="/menu#wallet" className="block px-3 py-2 hover:bg-gray-50">My Wallet</a>
              <button onClick={handleLogout} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600">
                Logout
              </button>
            </div>
          )}
        </div>
      )}
      {showOtp && <OTPLoginModal onClose={() => setShowOtp(false)} onLoggedIn={setUser} />}
    </>
  );
}

/* ---------- OTP modal (mock: OTP = 111111) ---------- */
function OTPLoginModal({
  onClose,
  onLoggedIn,
}: {
  onClose: () => void;
  onLoggedIn: (u: { name: string; phone: string }) => void;
}) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const sendOtp = async () => {
    setError("");
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Valid 10-digit phone required");
    // mock call
    await fetch("/api/otp/send", { method: "POST" });
    setStep("otp");
  };

  const verifyOtp = async () => {
    setError("");
    const res = await fetch("/api/otp/verify", { method: "POST", body: JSON.stringify({ otp }) });
    const data = await res.json();
    if (data.success) {
      const u = { name: "RailEater", phone };
      localStorage.setItem("raileats_user", JSON.stringify(u));
      onLoggedIn(u);
      onClose();
    } else setError("Invalid OTP");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">OTP Login</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-black">✕</button>
        </div>

        {step === "phone" ? (
          <>
            <label className="block text-sm mb-1">Phone Number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              placeholder="Enter 10-digit number"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button onClick={sendOtp} className="mt-3 w-full rounded-md bg-yellow-600 py-2 text-white hover:bg-yellow-700">
              Send OTP
            </button>
            <p className="mt-2 text-xs text-gray-500">Demo OTP: <b>111111</b></p>
          </>
        ) : (
          <>
            <label className="block text-sm mb-1">Enter OTP</label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full rounded-md border px-3 py-2 tracking-widest text-center"
              placeholder="6-digit"
              maxLength={6}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button onClick={verifyOtp} className="mt-3 w-full rounded-md bg-yellow-600 py-2 text-white hover:bg-yellow-700">
              Verify & Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
