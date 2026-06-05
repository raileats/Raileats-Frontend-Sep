"use client";

import { trackEvent } from "../lib/trackEvent";

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
        <button
          type="button"
          onClick={() =>
            trackEvent("home_offer_rel20_click", {
              section: "home_offers",
              metadata: {
                coupon: "REL20",
                offer: "Flat Rs 20 OFF",
              },
            })
          }
          className="app-card-compact border-yellow-200 bg-yellow-50 p-4 text-left"
        >
          <div className="text-lg font-black text-slate-950">Flat Rs 20 OFF</div>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            On all orders above Rs 250
          </p>
          <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-orange-600 shadow-sm">
            Code: REL20
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            trackEvent("home_offer_re50_click", {
              section: "home_offers",
              metadata: {
                coupon: "RE50",
                offer: "Flat Rs 50 OFF",
              },
            })
          }
          className="app-card-compact border-orange-200 bg-orange-50 p-4 text-left"
        >
          <div className="text-lg font-black text-slate-950">Flat Rs 50 OFF</div>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            On all orders above Rs 500
          </p>
          <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-orange-600 shadow-sm">
            Code: RE50
          </div>
        </button>
      </div>
    </section>
  );
}
