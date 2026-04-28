"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../lib/useAuth";

export default function ProfilePage() {
  const { user, setUser, loadUser } = useAuth();

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

      // 🔥 SAVE TO DB
      await fetch("/api/save-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedUser),
      });

      // 🔥 UPDATE LOCAL STATE
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

      <h1 className="text-xl font-semibold">My Profile</h1>

      <div className="rounded-xl border bg-white p-4 space-y-3 shadow">

        <Field label="Name" value={name} onChange={setName} />

        <Field
          label="Mobile"
          value={mobile}
          onChange={setMobile}
          readOnly
        />

        <Field
          label="Email"
          value={email}
          onChange={setEmail}
          type="email"
          placeholder="you@email.com"
        />

        <button
          onClick={save}
          disabled={loading}
          className="w-full rounded-md bg-yellow-600 py-2 text-white hover:bg-yellow-700"
        >
          {loading ? "Saving..." : "Save"}
        </button>

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
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        type={type}
        placeholder={placeholder}
        className="w-full rounded-md border px-3 py-2"
      />
    </label>
  );
}
