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
  const [loading, setLoading] = useState(false);

  /* 🔥 OPEN MODAL */
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

      alert("OTP: " + json.otp); // remove in prod
      setStep("otp");

    } catch {
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

      const phone = "+91" + mobile;

      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, otp }),
      });

      const json = await res.json();

      if (!json.success) {
        alert("Wrong OTP");
        return;
      }

      // 🔥 CHECK USER FROM DB
      const userRes = await fetch("/api/get-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const userData = await userRes.json();

      if (userData.exists) {
        // ✅ EXISTING USER AUTO FILL
        setName(userData.user.name || "");
        setEmail(userData.user.email || "");
      } else {
        // 🆕 NEW USER
        setName("");
        setEmail("");
      }

      setStep("profile");

    } catch {
      alert("Error verifying OTP");
    } finally {
      setLoading(false);
    }
  };

  /* ================= SAVE PROFILE ================= */
  const saveProfile = async () => {
    if (!name || !email) {
      alert("Name & Email required");
      return;
    }

    try {
      setLoading(true);

      const phone = "+91" + mobile;

      const user = {
        mobile: phone,
        name,
        email,
      };

      // 🔥 SAVE IN DB
      const res = await fetch("/api/save-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      });

      const json = await res.json();

      if (!json.success) {
        alert("Failed to save user");
        return;
      }

      // ✅ ZUSTAND + LOCAL STORAGE
      setUser(user);
      localStorage.setItem("raileats_user", JSON.stringify(user));

      // 🔥 CONTINUE CART
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

      // 🔥 HARD REFRESH → FIX ALL STATE
      setTimeout(() => {
        window.location.reload();
      }, 200);

    } catch {
      alert("Error saving profile");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg w-80 space-y-3">

        {/* MOBILE */}
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

        {/* OTP */}
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

        {/* PROFILE */}
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
              onClick={saveProfile}
              disabled={loading}
              className="bg-orange-600 text-white w-full p-2 rounded"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </>
        )}

      </div>
    </div>
  );
}
