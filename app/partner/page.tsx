"use client";

import { useState } from "react";

export default function PartnerForm() {
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    city: "",
    station: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form Submitted:", form);
    alert("Restaurant Partner request submitted!");
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">Become a Restaurant Partner</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          name="name"
          placeholder="Restaurant Name *"
          value={form.name}
          onChange={handleChange}
          required
          className="border p-2 rounded"
        />
        <input
          type="tel"
          name="mobile"
          placeholder="Mobile Number *"
          value={form.mobile}
          onChange={handleChange}
          required
          className="border p-2 rounded"
        />
        <input
          type="text"
          name="city"
          placeholder="City *"
          value={form.city}
          onChange={handleChange}
          required
          className="border p-2 rounded"
        />
        <input
          type="text"
          name="station"
          placeholder="Station Name (optional)"
          value={form.station}
          onChange={handleChange}
          className="border p-2 rounded"
        />

        <button
          type="submit"
          className="bg-yellow-400 text-black font-bold py-2 rounded"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
