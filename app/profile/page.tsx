"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../lib/useAuth";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function ProfilePage() {
  const user = useAuth((s) => s.user);
  const loadUser = useAuth((s) => s.loadUser);
  const logoutStore = useAuth((s) => s.logout);

  const router = useRouter();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  // 🔥 BULK MODAL STATE
  const [showBulkModal, setShowBulkModal] = useState(false);

  const [trainNumber, setTrainNumber] = useState("");
  const [journeyDate, setJourneyDate] = useState("");
  const [quantity, setQuantity] = useState("");

  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadUser();

    const raw = localStorage.getItem("raileats_user");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setName(u.name || "");
        setMobile(u.mobile || "");
        setEmail(u.email || "");
      } catch {}
    }
  }, []);

  /* 🔥 LOGOUT */
  const handleLogout = () => {
    logoutStore();
    localStorage.removeItem("raileats_user");
    window.location.replace("/");
  };

  /* 🔥 SUBMIT BULK QUERY */
  const handleSubmit = async () => {
    if (!trainNumber || !journeyDate || !quantity) {
      alert("Please fill all fields");
      return;
    }

    try {
      const { error } = await supabase
        .from("bulk_order_queries")
        .insert([
          {
            name: user?.name,
            mobile: user?.mobile,
            email: user?.email,
            train_number: trainNumber,
            journey_date: journeyDate,
            quantity: quantity,
          },
        ]);

      if (error) {
        console.error(error);
        alert("Error submitting enquiry");
        return;
      }

      setSuccess(true);
      setTrainNumber("");
      setJourneyDate("");
      setQuantity("");

    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };

  return (
    <main className="mx-auto w-full max-w-screen-sm p-4 space-y-4">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">My Profile</h1>

        <button
          onClick={() => router.back()}
          className="text-lg font-bold text-gray-600"
        >
          ✕
        </button>
      </div>

      {/* PROFILE CARD */}
      <div
        onClick={() => router.push("/profile/edit")}
        className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow cursor-pointer"
      >
        <div className="h-12 w-12 flex items-center justify-center rounded-full bg-red-500 text-white text-lg font-bold">
          {(name || user?.name || "U")?.charAt(0)}
        </div>

        <div className="flex-1">
          <div className="font-semibold text-lg">
            {name || user?.name || "Your Name"}
          </div>
          <div className="text-sm text-gray-500">
            {mobile || user?.mobile}
          </div>
        </div>

        <div>✏️</div>
      </div>

      {/* CONTACT */}
      <div className="rounded-xl border bg-white p-4 space-y-3 shadow">
        <Field label="Mobile" value={mobile || user?.mobile || ""} />
        <Field label="Email" value={email || user?.email || ""} />
      </div>

      {/* MENU */}
      <div className="rounded-xl border bg-white shadow divide-y">
        <MenuItem label="My Orders" />

        {/* 🔥 FIXED */}
        <MenuItem
          label="Group Orders"
          onClick={() => setShowBulkModal(true)}
        />

        <MenuItem label="Contact Us" onClick={() => router.push("/contact")} />
<MenuItem
  label="Feedback"
  onClick={() => {
    const user = JSON.parse(localStorage.getItem("raileats_user") || "null");

    if (!user) {
      // 🔥 login ke baad feedback open
      localStorage.setItem("afterLoginAction", "feedback");

      window.dispatchEvent(new CustomEvent("raileats:open-login"));
    } else {
      // 🔥 direct modal open (home page wala)
      window.dispatchEvent(new CustomEvent("raileats:open-feedback"));
    }
  }}
/>
<MenuItem label="About Us" onClick={() => router.push("/about")} />
<MenuItem label="FAQ" onClick={() => router.push("/faq")} />
<MenuItem label="Terms & Conditions" onClick={() => router.push("/terms")} />
<MenuItem label="Privacy Policy" onClick={() => router.push("/privacy-policy")} />
<MenuItem label="Cancellation Policy" onClick={() => router.push("/cancellation-refund")} />
      </div>

      {/* LOGOUT */}
      <button
        onClick={handleLogout}
        className="w-full rounded-md bg-red-500 py-2 text-white"
      >
        Logout
      </button>

      <div className="text-center text-sm text-gray-400">
        Version: 2.2.6
      </div>

      {/* 🔥 BULK ORDER MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

          <div className="bg-white rounded-xl p-5 w-[90%] max-w-md space-y-3">

            <h2 className="text-lg font-semibold">
              Bulk Order Query
            </h2>

            {success ? (
              <div className="text-green-600 text-center font-medium">
                Your query submitted successfully 🎉
              </div>
            ) : (
              <>
                <input
                  placeholder="Train Number"
                  value={trainNumber}
                  onChange={(e) => setTrainNumber(e.target.value)}
                  className="w-full border p-2 rounded"
                />

                <input
                  type="date"
                  value={journeyDate}
                  onChange={(e) => setJourneyDate(e.target.value)}
                  className="w-full border p-2 rounded"
                />

                <input
                  placeholder="Quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full border p-2 rounded"
                />

                <button
                  onClick={handleSubmit}
                  className="w-full bg-yellow-600 text-white py-2 rounded"
                >
                  Submit Enquiry
                </button>
              </>
            )}

            <button
              onClick={() => {
                setShowBulkModal(false);
                setSuccess(false);
              }}
              className="w-full bg-gray-400 text-white py-2 rounded"
            >
              Close
            </button>

          </div>
        </div>
      )}

    </main>
  );
}

/* FIELD */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        value={value}
        readOnly
        className="w-full rounded-md border px-3 py-2 bg-gray-50"
      />
    </label>
  );
}

/* MENU ITEM */
function MenuItem({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <span>{label}</span>
      <span>›</span>
    </div>
  );
}
