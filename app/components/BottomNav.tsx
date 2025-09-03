"use client";
import { useState } from "react";
import { Home, Train, Gift, Utensils, X } from "lucide-react";

export default function BottomNav() {
  const [isOpen, setIsOpen] = useState(false);

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
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium">Restaurant Name *</label>
                <input
                  type="text"
                  className="w-full border rounded p-2"
                  placeholder="Enter restaurant name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium">City / Station *</label>
                <input
                  type="text"
                  className="w-full border rounded p-2"
                  placeholder="Enter city or station"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Mobile Number *</label>
                <input
                  type="tel"
                  className="w-full border rounded p-2"
                  placeholder="Enter mobile number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Upload Kitchen Photo</label>
                <input type="file" className="w-full border rounded p-2" />
              </div>

              <div>
                <label className="block text-sm font-medium">Upload Dining Photo</label>
                <input type="file" className="w-full border rounded p-2" />
              </div>

              <div>
                <label className="block text-sm font-medium">Upload FSSAI Certificate</label>
                <input type="file" className="w-full border rounded p-2" />
              </div>

              <div>
                <label className="block text-sm font-medium">Upload GST Certificate</label>
                <input type="file" className="w-full border rounded p-2" />
              </div>
            </div>

            {/* Fixed Submit Button */}
            <div className="p-4 border-t bg-white sticky bottom-0">
              <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold">
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
