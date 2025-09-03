"use client";

export default function Steps() {
  return (
    <section className="mt-10 max-w-4xl mx-auto px-4">
      <h2 className="text-center font-bold mb-4">Order Food on Train in Easy Steps</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <div className="p-4 bg-white shadow rounded">📲 Enter PNR & Choose Station</div>
        <div className="p-4 bg-white shadow rounded">🍴 Select Restaurant & Create Order</div>
        <div className="p-4 bg-white shadow rounded">🚆 Get Food Delivery in Train</div>
      </div>
    </section>
  );
}
