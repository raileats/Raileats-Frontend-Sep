"use client";
import { useState } from "react";

export default function PartnerForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    restaurantName: "",
    mobile: "",
    city: "",
    kitchenPhoto: null,
    diningPhoto: null,
    frontPhoto: null,   // 👈 नया field
    fssai: null,
    gst: null,
  });

  const handleChange = (e: any) => {
    const { name, value, files } = e.target;
    setForm({
      ...form,
      [name]: files ? files[0] : value,
    });
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    console.log("Submitted form:", form);
    alert("Vendor form submitted! (Admin me Vendor Leads tab me save hoga)");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-lg shadow-lg overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-3 border-b">
          <h2 className="text-lg font-bold">Become a Restaurant Partner</h2>
          <button onClick={onClose} className="text-gray-500 text-2xl">&times;</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Restaurant Name */}
          <div>
            <label className="block text-sm font-medium">Restaurant Name *</label>
            <input
              type="text"
              name="restaurantName"
              required
              value={form.restaurantName}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-sm font-medium">Mobile Number *</label>
            <input
              type="tel"
              name="mobile"
              required
              value={form.mobile}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium">City / Station Name</label>
            <input
              type="text"
              name="city"
              value={form.city}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium">Upload Kitchen Photo</label>
            <input type="file" name="kitchenPhoto" onChange={handleChange} className="w-full" />
          </div>

          <div>
            <label className="block text-sm font-medium">Upload Dining Area Photo</label>
            <input type="file" name="diningPhoto" onChange={handleChange} className="w-full" />
          </div>

          {/* 👇 नया Front Facing Photo */}
          <div>
            <label className="block text-sm font-medium">Upload Front Facing Photo</label>
            <input type="file" name="frontPhoto" onChange={handleChange} className="w-full" />
          </div>

          <div>
            <label className="block text-sm font-medium">Upload FSSAI Copy</label>
            <input type="file" name="fssai" onChange={handleChange} className="w-full" />
          </div>

          <div>
            <label className="block text-sm font-medium">Upload GST Copy</label>
            <input type="file" name="gst" onChange={handleChange} className="w-full" />
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
