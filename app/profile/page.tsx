"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../lib/useAuth";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, setUser, loadUser } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

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

  const save = async () => {
    if (!name) {
      alert("Name required");
      return;
    }

    try {
      setLoading(true);

      const updatedUser = {
        mobile,
        name,
        email,
      };

      await fetch("/api/save-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedUser),
      });

      setUser(updatedUser);
      localStorage.setItem("raileats_user", JSON.stringify(updatedUser));

      alert("Profile updated");
    } catch {
      alert("Error saving profile");
    } finally {
      setLoading(false);
    }
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

        <Field label="Mobile" value={mobile} onChange={setMobile} readOnly />
        <Field label="Email" value={email} onChange={setEmail} />

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

      {/* 🔹 SAVE BUTTON */}
      <button
        onClick={save}
        disabled={loading}
        className="w-full rounded-md bg-yellow-600 py-2 text-white"
      >
        {loading ? "Saving..." : "Save Profile"}
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
  onChange,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className="w-full rounded-md border px-3 py-2"
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
