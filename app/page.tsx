import React from 'react';

export default function Home() {
  return (
    <main className="p-6 text-center bg-black min-h-screen text-white">
      <h1 className="text-4xl font-bold text-yellow-400">🚆 RailEats</h1>
      <p className="mt-2 text-lg">अब रेल यात्रा का स्वाद, सिर्फ RailEats के साथ 🍴</p>
      <div className="mt-6 bg-yellow-400 text-black p-4 rounded-lg">
        <p>🎁 Flat 20% OFF above ₹200 | Flat ₹50 OFF above ₹500 | FSSAI Approved | Vendor Verified</p>
      </div>
    </main>
  );
}