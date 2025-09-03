"use client";
import { useState } from "react";
import { X } from "lucide-react";

export default function PartnerForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    restaurantName: "",
    ownerName: "",
    mobile: "",
    city: "",
    fssai: "",
    gst: "",
    kitchenPhoto: null as File | null,
    diningPhoto: null as File | null,
    frontPhoto: null as File | null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFormData({ ...formData, [e.target.name]: e.target.files[0] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("📩 Submitted Data:", formData);
    alert("✅ Vendor Lead Submitted! (Data will go to Admin)");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg h-[90vh] flex flex-col">
        {/* Header with Close */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold">Become a Restaurant Partner</h2>
          <button onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          <input
            type="text"
            name="restaurantName"
            placeholder="Restaurant Name *"
            className="w-full border p-2 rounded"
            required
            onChange={handleChange}
          />
          <input
            type="text"
            name="ownerName"
            placeholder="Owner Name"
            className="w-full border p-2 rounded"
            onChange={handleChange}
          />
          <input
            type="tel"
            name="mobile"
            placeholder="Mobile Number *"
            className="w-full border p-2 rounded"
            required
            onChange={handleChange}
          />
          <input
            type="text"
            name="city"
            placeholder="City / Station *"
            className="w-full border p-2 rounded"
            required
            onChange={handleChange}
          />

          <input
            type="text"
            name="fssai"
            placeholder="FSSAI No. (Optional)"
            className="w-full border p-2 rounded"
            onChange={handleChange}
          />
          <input
            type="text"
            name="gst"
            placeholder="GST No. (Optional)"
            className="w-full border p-2 rounded"
            onChange={handleChange}
          />

          <label className="block">
            <span className="text-sm">Upload Kitchen Photo</span>
            <input type="file" name="kitchenPhoto" onChange={handleFile} />
          </label>
          <label className="block">
            <span className="text-sm">Upload Dining Photo</span>
            <input type="file" name="diningPhoto" onChange={handleFile} />
          </label>
          <label className="block">
            <span className="text-sm">Upload Front Facing Photo</span>
            <input type="file" name="frontPhoto" onChange={handleFile} />
          </label>
        </form>

        {/* Fixed Submit Button */}
        <div className="p-4 border-t">
          <button
            type="submit"
            form="partnerForm"
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
