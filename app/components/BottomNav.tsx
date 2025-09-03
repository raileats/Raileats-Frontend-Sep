"use client";
import { useState } from "react";
import { Home, Train, Gift, Utensils, X } from "lucide-react";

export default function BottomNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    restaurant: "",
    city: "",
    mobile: "",
    kitchen: null as File | null,
    dining: null as File | null,
    frontfacing: null as File | null,
    fssai: null as File | null,
    gst: null as File | null,
  });

  // Handle change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormData({ ...formData, [name]: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("📩 Vendor Partner Form Data:", formData);
    alert("✅ Vendor form submitted! Check console for details.");
    setIsOpen(false);
  };

  return (
    <>
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t shadow z-50">
        <div className="max-w-5xl mx-auto grid grid-cols-5 text-center text-xs">
          {/* Home */}
          <a href="/" className="flex flex-col items-center py-2 text-gray-700">
            <Home size={22} />
            <span>Home</span>
          </a>

          {/* Tools */}
          <a href="/tools" className="flex flex-col items-center py-2 text-gray-700">
            <Train size={22} />
            <span>Tools</span>
          </a>

          {/* Partner */}
          <button
            onClick={() => setIsOpen(true)}
            className="flex flex-col items-center py-2 text-gray-700"
          >
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-yellow-400">
              <img src="/logo.png" alt="RailEats" className="h-5 w-5" />
            </div>
            <span>Partner</span>
          </button>

          {/* Offers */}
          <a href="/offers" className="flex flex-col items-center py-2 text-gray-700">
            <Gift size={22} />
            <span>Offers</span>
          </a>

          {/* My Menu */}
          <a href="/menu" className="flex flex-col items-center py-2 text-gray-700">
            <Utensils size={22} />
            <span>My Menu</span>
          </a>
        </div>
      </nav>

      {/* Partner Form Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center">
          <div className="bg-white w-full max-w-lg h-[90vh] rounded-t-2xl shadow-lg flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">Become a Vendor Partner</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-600 hover:text-black">
                <X size={24} />
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium">Restaurant Name *</label>
                <input
                  type="text"
                  name="restaurant"
                  value={formData.restaurant}
                  onChange={handleChange}
                  className="w-full border rounded p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium">City / Station *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full border rounded p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Mobile Number *</label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  className="w-full border rounded p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Upload Kitchen Photo</label>
                <input type="file" name="kitchen" onChange={handleChange} className="w-full border rounded p-2" />
              </div>

              <div>
                <label className="block text-sm font-medium">Upload Dining Photo</label>
                <input type="file" name="dining" onChange={handleChange} className="w-full border rounded p-2" />
              </div>

              <div>
                <label className="block text-sm font-medium">Upload FSSAI Certificate</label>
                <input type="file" name="fssai" onChange={handleChange} className="w-full border rounded p-2" />
              </div>

              <div>
                <label className="block text-sm font-medium">Upload GST Certificate</label>
                <input type="file" name="gst" onChange={handleChange} className="w-full border rounded p-2" />
              </div>

              {/* Fixed Submit Button */}
              <div className="p-4 border-t bg-white sticky bottom-0">
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
