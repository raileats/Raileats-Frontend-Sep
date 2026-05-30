"use client";

export default function Offers() {
  return (
    <section id="offers" className="container-app">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="app-section-title">Offers for your journey</h2>
          <p className="app-muted text-sm">Use these codes during checkout.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="app-card-compact border-yellow-200 bg-yellow-50 p-4">
          <div className="text-lg font-black text-slate-950">Flat Rs 20 OFF</div>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            On all orders above Rs 250
          </p>
          <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-orange-600 shadow-sm">
            Code: REL20
          </div>
        </div>

        <div className="app-card-compact border-orange-200 bg-orange-50 p-4">
          <div className="text-lg font-black text-slate-950">Flat Rs 50 OFF</div>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            On all orders above Rs 500
          </p>
          <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-orange-600 shadow-sm">
            Code: RE50
          </div>
        </div>
      </div>
    </section>
  );
}
