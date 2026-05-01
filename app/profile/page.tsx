"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../lib/useAuth";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const user = useAuth((s) => s.user);
  const loadUser = useAuth((s) => s.loadUser);
  const logoutStore = useAuth((s) => s.logout);

  const router = useRouter();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

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

    // 🔥 FULL REFRESH FIX
    window.location.replace("/");
  };

  return (
    <main className="mx-auto w-full max-w-screen-sm p-4 space-y-4">

      {/* 🔹 HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">My Profile</h1>

        {/* ❌ BACK BUTTON */}
        <button
          onClick={() => router.back()}
          className="text-lg font-bold text-gray-600"
        >
          ✕
        </button>
      </div>

      {/* 🔹 PROFILE CARD */}
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

      {/* 🔹 CONTACT INFO */}
      <div className="rounded-xl border bg-white p-4 space-y-3 shadow">
        <Field label="Mobile" value={mobile || user?.mobile || ""} />
        <Field label="Email" value={email || user?.email || ""} />
      </div>

      {/* 🔹 MENU */}
      <div className="rounded-xl border bg-white shadow divide-y">
        <MenuItem label="My Orders" />
        <MenuItem
  label="Group Orders"
  onClick={() => router.push("/?goto=bulk")}
/>
        <MenuItem label="Contact Us" />
        <MenuItem label="Feedback" />
        <MenuItem label="About Us" />
        <MenuItem label="FAQ" />
        <MenuItem label="Terms & Conditions" />
        <MenuItem label="Privacy Policy" />
        <MenuItem label="Cancellation Policy" />
        <MenuItem label="Rate Us" />
      </div>

      {/* 🔥 LOGOUT */}
      <button
        onClick={handleLogout}
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
}: {
  label: string;
  value: string;
}) {
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

/* ================= MENU ITEM ================= */

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
      className="flex items-center justify-between px-4 py-3 text-sm cursor-pointer hover:bg-gray-50"
    >
      <span>{label}</span>
      <span>›</span>
    </div>
  );
}
