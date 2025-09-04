"use client";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("raileats_user");
    if (raw) {
      const u = JSON.parse(raw);
      setName(u.name || ""); setPhone(u.phone || ""); setEmail(u.email || "");
    }
  }, []);

  const save = () => {
    const raw = localStorage.getItem("raileats_user");
    const u = raw ? JSON.parse(raw) : {};
    u.name = name; u.phone = phone; u.email = email;
    localStorage.setItem("raileats_user", JSON.stringify(u));
    alert("Profile saved");
  };

  return (
    <main className="mx-auto w-full max-w-screen-sm p-4">
      <h1 className="text-xl font-semibold mb-3">My Profile</h1>
      <div className="space-y-3 rounded-xl border bg-white p-4">
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Phone" value={phone} onChange={setPhone} readOnly />
        <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@email.com" />
        <button onClick={save} className="mt-2 w-full rounded-md bg-yellow-600 py-2 text-white hover:bg-yellow-700">
          Save
        </button>
      </div>
    </main>
  );
}
function Field({label,value,onChange,readOnly=false,type="text",placeholder=""}:{label:string;value:string;onChange:(v:string)=>void;readOnly?:boolean;type?:string;placeholder?:string;}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input value={value} onChange={e=>onChange(e.target.value)} readOnly={readOnly} type={type} placeholder={placeholder}
             className="w-full rounded-md border px-3 py-2"/>
    </label>
  );
}
