"use client";

export default function ExploreRailInfo() {
  return (
    <section className="mt-10 max-w-4xl mx-auto px-4">
      <h2 className="text-center font-bold mb-4">Explore Railway Information</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="p-4 bg-white shadow rounded">🚆 Track Live Train</div>
        <div className="p-4 bg-white shadow rounded">📋 Check PNR Status</div>
        <div className="p-4 bg-white shadow rounded">📍 Platform Locator</div>
        <div className="p-4 bg-white shadow rounded">🕒 Train Time Table</div>
      </div>
    </section>
  );
}
