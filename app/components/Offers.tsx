"use client";

export default function Offers() {
  return (
    <section className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto px-4">
      <div className="bg-yellow-200 p-4 rounded-lg shadow text-center">
        <h3 className="font-bold">🎉 Flat ₹20 OFF</h3>
        <p>On all orders above ₹250</p>
        <p className="text-sm text-gray-600">Use Code: REL20</p>
      </div>
      <div className="bg-yellow-200 p-4 rounded-lg shadow text-center">
        <h3 className="font-bold">🔥 Flat ₹50 OFF</h3>
        <p>On all orders above ₹500</p>
        <p className="text-sm text-gray-600">Use Code: RE50</p>
      </div>
    </section>
  );
}
