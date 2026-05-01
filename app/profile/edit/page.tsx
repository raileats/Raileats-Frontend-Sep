"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../lib/useAuth";

export default function EditProfilePage() {
  const { user, setUser, loadUser } = useAuth();

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

  const handleSave = async () => {
    if (!name) {
      alert("Name required");
      return;
    }

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

    alert("Profile Updated");
  };

  return (
    <main className="mx-auto max-w-screen-sm p-4 space-y-4">

      <h1 className="text-xl font-semibold">Edit Profile</h1>

      <Field label="Name" value={name} onChange={setName} />
      <Field label="Mobile" value={mobile} onChange={setMobile} readOnly />
      <Field label="Email" value={email} onChange={setEmail} />

      <button
        onClick={handleSave}
        className="w-full bg-yellow-600 text-white py-2 rounded"
      >
        Save
      </button>

    </main>
  );
}

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
