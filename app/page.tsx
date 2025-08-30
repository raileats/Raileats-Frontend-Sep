import React from 'react';

export default function Home() {
  return (
    <main className="p-6 text-center bg-black min-h-screen text-white">
      <h1 className="text-4xl font-bold text-yellow-400">🚆 RailEats</h1>
      <p className="mt-2 text-lg">अब रेल यात्रा का स्वाद, सिर्फ RailEats के साथ 🍴</p>

      {/* Offers Carousel placeholder */}
      <div className="mt-6 bg-yellow-400 text-black p-4 rounded-lg">
        <p>🎁 Flat 20% OFF above ₹200 | Flat ₹50 OFF above ₹500 | FSSAI Approved | Vendor Verified</p>
      </div>

      {/* Search Tabs placeholder */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">🔍 Search Food Delivery</h2>
        <div className="flex justify-center gap-4">
          <button className="bg-yellow-400 text-black px-4 py-2 rounded">Search by PNR</button>
          <button className="bg-yellow-400 text-black px-4 py-2 rounded">Search by Train</button>
          <button className="bg-yellow-400 text-black px-4 py-2 rounded">Search by Station</button>
        </div>
      </div>

      {/* Dummy Outlets List */}
      <div className="mt-10 text-left max-w-xl mx-auto">
        <h3 className="text-xl font-bold mb-3">🍴 Available Outlets (Demo)</h3>
        <ul className="space-y-2">
          <li className="bg-gray-800 p-3 rounded">Delhi Zaika (NDLS) - ⭐ 4.5 - Veg</li>
          <li className="bg-gray-800 p-3 rounded">Capital Foods (NDLS) - ⭐ 4.3 - Non-Veg</li>
          <li className="bg-gray-800 p-3 rounded">Mumbai Spice (BCT) - ⭐ 4.2 - Seafood</li>
        </ul>
      </div>
    </main>
  );
}
