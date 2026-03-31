import React from "react";
import { extractStationCode } from "../../lib/stationSlug";
import { serviceClient } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";

/* ---------------- Helpers ---------------- */
function formatTime(t?: string | null) {
  return t ? t.slice(0, 5) : "--:--";
}

/* ---------------- Page ---------------- */
export default async function Page({ params, searchParams }: any) {
  const rawSlug = params.slug || "";
  const stationCode = extractStationCode(rawSlug).toUpperCase();

  // URL se basic info nikalna
  const trainNum = searchParams.train || "";
  const boarding = searchParams.boarding || "";
  const urlDate = searchParams.date || ""; // Ye formatted bhi ho sakti hai (1 Apr 2026)

  let displayDate = urlDate; 
  let arrivalTime = "--:--";
  let restaurants: any[] = [];
  let stationName = stationCode;

  try {
    // 1. Sabse pehle Train Route se exact Day aur Arrival nikalna
    const { data: route } = await serviceClient
      .from("TrainRoute")
      .select("StationName, Day, Arrives, StationCode")
      .eq("trainNumber", trainNum)
      .order("StnNumber", { ascending: true });

    if (route && route.length > 0) {
      const bStn = route.find(r => r.StationCode === boarding.toUpperCase());
      const cStn = route.find(r => r.StationCode === stationCode);

      if (cStn) {
        stationName = cStn.StationName;
        arrivalTime = formatTime(cStn.Arrives);

        // Agar humein boarding station mil gaya, toh hum date confirm kar sakte hain
        // Note: Agar date already formatted hai toh hum use hi dikhayenge
      }
    }

    // 2. Restaurants fetch karna (Directly from Supabase for speed)
    const { data: restros } = await serviceClient
      .from("RestroMaster")
      .select("*")
      .eq("StationCode", stationCode)
      .or('RaileatsStatus.eq.Active,IsActive.eq.true');

    restaurants = restros || [];

  } catch (err) {
    console.error("Data Fetch Error:", err);
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 font-sans">
      
      {/* ✅ FIX: Solid Date Header */}
      <div className="bg-[#fdf2f0] border border-orange-100 p-4 rounded-2xl mb-8 flex justify-between items-center shadow-sm">
        <div className="flex flex-col">
          <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider mb-1">Delivery Date</span>
          <span className="text-lg font-extrabold text-gray-800">{displayDate || "Select Date"}</span>
        </div>
        <div className="flex flex-col text-right border-l border-orange-200 pl-4">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Train Arrival</span>
          <span className="text-lg font-extrabold text-gray-800">{arrivalTime}</span>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 leading-tight">
          Restaurants at <span className="text-orange-500">{stationName}</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1 font-medium">Choose your favorite meal for the journey</p>
      </div>

      {restaurants.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <p className="text-gray-400 font-bold">No active restaurants found at this station.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {restaurants.map((r: any) => (
            <div key={r.RestroCode} className="group bg-white border border-gray-100 p-5 rounded-3xl shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-xl text-gray-800 group-hover:text-orange-600 transition-colors">{r.RestroName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      ★ {r.RestroRating || "4.2"}
                    </span>
                    {r.IsPureVeg && <span className="text-[10px] text-green-600 font-bold border border-green-200 px-2 py-0.5 rounded-full">PURE VEG</span>}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 py-4 border-t border-gray-50 mt-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">Service Hours</span>
                  <span className="text-xs font-bold text-gray-700">{formatTime(r.open_time)} - {formatTime(r.closed_time)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">Min. Order</span>
                  <span className="text-xs font-bold text-gray-700">₹{r.MinimumOrderValue || r.MinimumOrdermValue || "0"}</span>
                </div>
              </div>

              <a
                href={`/Stations/${rawSlug}/${r.RestroCode}-${(r.RestroName || "").replace(/\s+/g, "-")}?date=${encodeURIComponent(displayDate)}&train=${trainNum}&boarding=${boarding}`}
                className="mt-4 w-full inline-flex justify-center items-center bg-gray-900 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-gray-200"
              >
                View Menu & Order
              </a>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
