"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/useAuth";

export default function EditProfilePage() {
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
      try {
        const u = JSON.parse(raw);
        setName(u.name || "");
        setMobile(u.mobile || "");
        setEmail(u.email || "");
      } catch {}
    }
  }, []);

  const handleSave = async () => {
    if (!name) {
      alert("Name required");
      return;
    }

    try {
      setLoading(true);

      const updatedUser = { name, mobile, email };

      await fetch("/api/save-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedUser),
      });

      setUser(updatedUser);
      localStorage.setItem("raileats_user", JSON.stringify(updatedUser));

      // 🔥 REDIRECT AFTER SAVE
      router.push("/profile");

    } catch {
      alert("Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-screen-sm p-4 space-y-4">

      {/* 🔹 HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Edit Profile</h1>

        {/* 🔥 CANCEL BUTTON */}
        <button
          onClick={() => router.push("/profile")}
          className="text-red-500 font-medium"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-3">

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
        />

      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full bg-yellow-600 text-white py-2 rounded"
      >
        {loading ? "Saving..." : "Save"}
      </button>

    </main>
  );
}

/* ================= FIELD ================= */

function Field({ label, value, onChange, readOnly = false }: any) {
  return (
    <label className="block">
      <span className="text-sm">{label}</span>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className="w-full border p-2 rounded"
      />
    </label>
  );
}
