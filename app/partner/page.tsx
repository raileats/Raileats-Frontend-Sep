"use client";
import { useState } from "react";

export default function PartnerForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    restaurantName: "",
    mobile: "",
    city: "",
    fssai: "",
    gst: "",
    kitchenPhoto: null as File | null,
    diningPhoto: null as File | null,
    frontPhoto: null as File | null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted", formData);
    alert("Form Submitted!");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-black"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-4">Become a Restaurant Partner</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Restaurant Name *"
            required
            className="w-full border p-2 rounded"
            value={formData.restaurantName}
            onChange={(e) =>
              setFormData({ ...formData, restaurantName: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="Mobile *"
            required
            className="w-full border p-2 rounded"
            value={formData.mobile}
            onChange={(e) =>
              setFormData({ ...formData, mobile: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="City *"
            required
            className="w-full border p-2 rounded"
            value={formData.city}
            onChange={(e) =>
              setFormData({ ...formData, city: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="FSSAI Number"
            className="w-full border p-2 rounded"
            value={formData.fssai}
            onChange={(e) =>
              setFormData({ ...formData, fssai: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="GST Number"
            className="w-full border p-2 rounded"
            value={formData.gst}
            onChange={(e) =>
              setFormData({ ...formData, gst: e.target.value })
            }
          />

          {/* File Uploads */}
          <label className="block">
            Kitchen Photo:
            <input
              type="file"
              className="w-full mt-1"
              onChange={(e) =>
                setFormData({ ...formData, kitchenPhoto: e.target.files?.[0] || null })
              }
            />
          </label>
          <label className="block">
            Dining Photo:
            <input
              type="file"
              className="w-full mt-1"
              onChange={(e) =>
                setFormData({ ...formData, diningPhoto: e.target.files?.[0] || null })
              }
            />
          </label>
          <label className="block">
            Front Facing Photo:
            <input
              type="file"
              className="w-full mt-1"
              onChange={(e) =>
                setFormData({ ...formData, frontPhoto: e.target.files?.[0] || null })
              }
            />
          </label>

          {/* Fixed Submit */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded mt-4"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}
