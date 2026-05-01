"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../lib/useAuth";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, loadUser } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    loadUser();

    const raw = localStorage.getItem("raileats_user");
    if (raw) {
      const u = JSON.parse(raw);
      setName(u.name || "");
      setMobile(u.mobile || "");
      setEmail(u.email || "");
    }
  }, []);

  /* 🔥 LOGOUT */
  const logout = () => {
    localStorage.removeItem("raileats_user");

    // अगर auth context में कुछ clear करना हो तो यहाँ करो

    router.push("/"); // 👉 homepage
  };

  return (
    <main className="mx-auto w-full max-w-screen-sm p-4 space-y-4">

      {/* 🔹 PROFILE CARD (CLICKABLE) */}
      <div
        onClick={() => router.push("/profile/edit")}
        className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow cursor-pointer"
      >
        <div className="h-12 w-12 flex items-center justify-center rounded-full bg-red-500 text-white text-lg font-bold">
          {name?.charAt(0) || "U"}
        </div>

        <div className="flex-1">
          <div className="font-semibold text-lg">{name || "Your Name"}</div>
          <div className="text-sm text-gray-500">{mobile}</div>
        </div>

        <div>✏️</div>
      </div>

      {/* 🔹 CONTACT INFO */}
      <div className="rounded-xl border bg-white p-4 space-y-3 shadow">
        <Field label="Mobile" value={mobile} readOnly />
        <Field label="Email" value={email} readOnly />
      </div>

      {/* 🔹 MENU LIST */}
      <div className="rounded-xl border bg-white shadow divide-y">
        <MenuItem label="My Orders" />
        <MenuItem label="Group Orders" />
        <MenuItem label="Contact Us" />
        <MenuItem label="Feedback" />
        <MenuItem label="About Us" />
        <MenuItem label="FAQ" />
        <MenuItem label="Terms & Conditions" />
        <MenuItem label="Privacy Policy" />
        <MenuItem label="Cancellation Policy" />
        <MenuItem label="Rate Us" />
      </div>

      {/* 🔥 LOGOUT BUTTON */}
      <button
        onClick={logout}
        className="w-full rounded-md bg-red-500 py-2 text-white"
      >
        Logout
      </button>

      {/* VERSION */}
      <div className="text-center text-sm text-gray-400">
        Version: 2.2.6
      </div>

    </main>
  );
}

/* ================= FIELD ================= */

function Field({
  label,
  value,
  readOnly = false,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>

      <input
        value={value}
        readOnly={readOnly}
        className="w-full rounded-md border px-3 py-2 bg-gray-50"
      />
    </label>
  );
}

/* ================= MENU ITEM ================= */

function MenuItem({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm cursor-pointer hover:bg-gray-50">
      <span>{label}</span>
      <span>›</span>
    </div>
  );
}
