import React from "react";
import { extractStationCode } from "../../lib/stationSlug";
import { serviceClient } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";

/* ---------------- Helpers ---------------- */
function formatTime(t?: string | null) {
  if (!t) return "--:--";
  return t.slice(0, 5);
}

// Function to calculate delivery date based on Day difference
function calculateDeliveryDate(baseDateStr: string, boardingDay: number, currentDay: number) {
  try {
    // Agar date "1 Apr 2026" format mein hai, toh use parse karne ki koshish karein
    const d = new Date(baseDateStr);
    if (isNaN(d.getTime())) return baseDateStr; // Fallback if parsing fails

    const dayDiff = currentDay - boardingDay;
    d.setDate(d.getDate() + dayDiff);

    return d.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  } catch (e) {
    return baseDateStr;
  }
}

/* ---------------- Page ---------------- */
export default async function Page({ params, searchParams }: any) {
  const rawSlug = params.slug || "";
  const stationCode = extractStationCode(rawSlug).toUpperCase();

  // URL Params
  const trainNum = searchParams.train || "";
  const boarding = searchParams.boarding || "";
  const dateFromUrl = searchParams.date || ""; 

  let finalDisplayDate = dateFromUrl;
  let arrivalTime = "--:--";
  let stationName = stationCode;
  let restaurants: any[] = [];

  try {
    // 1. Fetch Train Route to get Day and Arrival Time
    const { data: routeData } = await serviceClient
      .from("TrainRoute")
      .select("StationCode, StationName, Day, Arrives")
      .eq("trainNumber", trainNum)
      .order("StnNumber", { ascending: true });

    if (routeData && routeData.length > 0) {
      const boardingStn = routeData.find(r => r.StationCode.toUpperCase() === boarding.toUpperCase());
      const currentStn = routeData.find(r => r.StationCode.toUpperCase() === stationCode);

      if (currentStn) {
        stationName = currentStn.StationName;
        arrivalTime = formatTime(currentStn.Arrives);
        
        // 2. Logic: Date Calculation from Train Route Slug
        if (boardingStn && dateFromUrl) {
          finalDisplayDate = calculateDeliveryDate(
            dateFromUrl, 
            Number(boardingStn.Day || 1), 
            Number(currentStn.Day || 1)
          );
        }
      }
    }

    // 3. Fetch Restaurants
    const { data: restros } = await serviceClient
      .from("RestroMaster")
      .select("*")
      .eq("StationCode", stationCode)
      .or('RaileatsStatus.eq.Active,IsActive.eq.true');

    restaurants = restros || [];

  } catch (err) {
    console.error("Error in Station Page:", err);
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      
      {/* ✅ FIXED HEADER: Date calculated from Train Route */}
      <div className="bg-orange-50 border border-orange-200 p-5 rounded-2xl mb-8 flex justify-between items-center shadow-sm">
        <div className="border-l-4 border-orange-500 pl-4">
          <p className="text-[10px] text-orange-600 font-black uppercase tracking-tighter mb-1">Delivery Date</p>
          <p className="text-xl font-extrabold text-gray-900">{finalDisplayDate}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Train Arrival</p>
          <p className="text-xl font-extrabold text-gray-900">{arrivalTime}</p>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-black text-gray-900">
          Order Food at <span className="text-orange-500">{stationName}</span>
        </h1>
        <p className="text-gray-500 font-medium">Get fresh meal delivered at your train seat</p>
      </div>

      {/* RESTAURANTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {restaurants.length > 0 ? (
          restaurants.map((r) => (
            <div key={r.RestroCode} className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-xl">{r.RestroName}</h3>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-lg">★ {r.RestroRating || "4.2"}</span>
              </div>
              
              <div className="flex gap-4 mt-4 py-3 border-y border-gray-50">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Time</p>
                  <p className="text-sm font-bold">{formatTime(r.open_time)} - {formatTime(r.closed_time)}</p>
                </div>
                <div className="border-l pl-4">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Min Order</p>
                  <p className="text-sm font-bold">₹{r.MinimumOrderValue || r.MinimumOrdermValue || "0"}</p>
                </div>
              </div>

              <a
                href={`/Stations/${rawSlug}/${r.RestroCode}-${(r.RestroName || "").replace(/\s+/g, "-")}?date=${finalDisplayDate}&train=${trainNum}&boarding=${boarding}`}
                className="mt-6 block w-full text-center bg-gray-900 text-white font-bold py-4 rounded-2xl hover:bg-orange-600 transition-colors shadow-lg"
              >
                View Menu
              </a>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-gray-400 font-bold">
            No active restaurants found at this station.
          </div>
        )}
      </div>
    </main>
  );
}
