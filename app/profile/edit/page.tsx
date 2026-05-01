"use client";

import { useState } from "react";
import { useUser } from "@/context/UserContext";

export default function EditProfilePage() {
  const { user, setUser } = useUser();

  const [name, setName] = useState(user?.name || "");
  const [mobile, setMobile] = useState(user?.mobile || "");
  const [email, setEmail] = useState(user?.email || "");

  const handleSave = () => {
    setUser({
      ...user!,
      name,
      mobile,
      email,
    });

    alert("Profile Updated");
  };

  return (
    <div className="p-4">
      <h2>Edit Profile</h2>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
      />

      <input
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
        placeholder="Mobile"
      />

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />

      <button onClick={handleSave}>Save</button>
    </div>
  );
}
