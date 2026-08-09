"use client";

import { useEffect, useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { firebaseAuth } from "../../lib/firebase";
import { useAuth } from "../lib/useAuth";
import { useCart } from "../lib/useCart";
import { useRouter } from "next/navigation";

const LOCAL_DEVELOPMENT_OTP = "123456";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: any;
  }
}

export default function LoginModal() {
  const { setUser } = useAuth();
  const { add, setJourney } = useCart();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"mobile" | "otp" | "profile">("mobile");

  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [pendingItem, setPendingItem] = useState<any>(null);
  const [pendingCartItem, setPendingCartItem] = useState<any>(null);
  const [pendingJourney, setPendingJourney] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const isLocalDevelopment =
    process.env.NODE_ENV === "development" &&
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const resetRecaptcha = () => {
    window.recaptchaVerifier?.clear();
    window.recaptchaVerifier = undefined;
    window.confirmationResult = undefined;
  };

  const closeModal = () => {
    resetRecaptcha();
    setOpen(false);
    setStep("mobile");
    setMobile("");
    setOtp("");
    setName("");
    setEmail("");
    setPendingItem(null);
    setPendingCartItem(null);
    setPendingJourney(null);
  };

  useEffect(() => {
    const handler = (e: any) => {
      setOpen(true);
      setPendingItem(e.detail?.item || null);
      setPendingCartItem(e.detail?.cartItem || null);
      setPendingJourney(e.detail?.journey || null);
      setStep("mobile");
    };

    window.addEventListener("raileats:open-login", handler);
    return () => window.removeEventListener("raileats:open-login", handler);
  }, []);

  const sendOtp = async () => {
    if (!/^[6-9][0-9]{9}$/.test(mobile)) {
      return alert("Please enter a valid 10-digit mobile number.");
    }

    try {
      setLoading(true);

      if (isLocalDevelopment) {
        window.confirmationResult = undefined;
        setStep("otp");
        return;
      }

      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(
          firebaseAuth,
          "recaptcha-container",
          { size: "invisible" }
        );
      }

      const phone = "+91" + mobile;

      const confirmationResult = await signInWithPhoneNumber(
        firebaseAuth,
        phone,
        window.recaptchaVerifier
      );

      window.confirmationResult = confirmationResult;

      alert("Your OTP has been sent to your mobile");
      setStep("otp");
    } catch (err: any) {
      console.error(err);
      resetRecaptcha();
      alert(
        err?.code === "auth/invalid-app-credential"
          ? "OTP verification could not start. Please retry or use the deployed RailEats website."
          : err?.message || "Error sending OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^[0-9]{4,6}$/.test(otp)) {
      return alert("Please enter valid OTP.");
    }

    try {
      setLoading(true);

      if (isLocalDevelopment) {
        if (otp !== LOCAL_DEVELOPMENT_OTP) {
          alert(`For localhost, use test OTP ${LOCAL_DEVELOPMENT_OTP}.`);
          return;
        }
      } else if (!window.confirmationResult) {
        alert("OTP session expired. Please send OTP again.");
        setStep("mobile");
        return;
      } else {
        await window.confirmationResult.confirm(otp);
      }

      const phone = "+91" + mobile;

      const userRes = await fetch("/api/get-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const userData = await userRes.json();

      if (userData.exists) {
        setName(userData.user.name || "");
        setEmail(userData.user.email || "");
      } else {
        setName("");
        setEmail("");
      }

      setStep("profile");
    } catch (err: any) {
      console.error(err);
      alert("Wrong OTP");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!name || !email) {
      alert("Name & Email required");
      return;
    }

    try {
      setLoading(true);

      const phone = "+91" + mobile;
      const user = { mobile: phone, name, email };

      const res = await fetch("/api/save-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });

      const json = await res.json();

      if (!json.success) {
        alert("Failed to save user");
        return;
      }

      await fetch("/api/update-last-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      setUser(user);

      if (pendingJourney) setJourney(pendingJourney);

      if (pendingCartItem) {
        add(pendingCartItem);
      } else if (pendingItem) {
        add({
          id: pendingItem.id,
          name: pendingItem.item_name,
          price: pendingItem.base_price,
          qty: 1,
        } as any);
      }

      closeModal();
      router.refresh();
    } catch {
      alert("Error saving profile");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="relative bg-white p-5 rounded-xl w-80 space-y-4 shadow-lg">
        <div id="recaptcha-container"></div>

        <button
          onClick={closeModal}
          className="absolute top-3 right-3 text-red-500 hover:text-red-700 text-lg font-bold"
        >
          ✕
        </button>

        {step === "mobile" && (
          <>
            <input
              type="tel"
              placeholder="Enter 10 digit mobile number"
              value={mobile}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, "");
                if (value.length === 1 && !/[6-9]/.test(value)) return;
                setMobile(value.slice(0, 10));
              }}
              inputMode="numeric"
              maxLength={10}
              className="border p-2 w-full rounded-md"
            />

            <button
              onClick={sendOtp}
              disabled={loading}
              className="bg-blue-600 text-white w-full p-2 rounded-md disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </>
        )}

        {step === "otp" && (
          <>
            {isLocalDevelopment && (
              <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
                Local test OTP: <strong>{LOCAL_DEVELOPMENT_OTP}</strong>
              </p>
            )}

            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => {
                const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(onlyDigits);
              }}
              inputMode="numeric"
              maxLength={6}
              className="border p-2 w-full rounded-md"
            />

            <button
              onClick={verifyOtp}
              disabled={loading}
              className="bg-green-600 text-white w-full p-2 rounded-md disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </>
        )}

        {step === "profile" && (
          <>
            <input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border p-2 w-full rounded-md"
            />

            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border p-2 w-full rounded-md"
            />

            <button
              onClick={saveProfile}
              disabled={loading}
              className="bg-orange-600 text-white w-full p-2 rounded-md disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
