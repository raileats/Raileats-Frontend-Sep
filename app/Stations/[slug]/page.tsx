import React from "react";
import { extractStationCode } from "../../lib/stationSlug";
import { serviceClient } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";

/* ---------------- Helpers ---------------- */
function formatTime(t?: string | null) {
  if (!t) return "--:--";
  return t.slice(0, 5);
}

// 100% Manual Date Calculation (No dependency on new Date() parsing)
function getFinalDate(searchDate: string, boardingDay: number, currentDay: number) {
  if (!searchDate) return "";
  
  try {
    const parts = searchDate.split(" "); // ["1", "Apr", "2026"]
    if (parts.length !== 3) return searchDate;

    let day = parseInt(parts[0]);
    const monthStr = parts[1];
    const year = parseInt(parts[2]);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let monthIdx = months.findIndex(m => m.toLowerCase() === monthStr.toLowerCase().slice(0, 3));

    // Train Route Day Difference
    const diff = (currentDay || 1) - (boardingDay || 1);
    
    // Manual Day Addition logic
    const d = new Date(year, monthIdx, day);
    d.setDate(d.getDate() + diff);

    // Format back to "01 Apr 2026"
    const finalDay = String(d.getDate()).padStart(2, '0');
    const finalMonth = months[d.getMonth()];
    const finalYear = d.getFullYear();

    return `${finalDay} ${finalMonth} ${finalYear}`;
  } catch (e) {
    return searchDate;
  }
}

/* ---------------- Page ---------------- */
export default async function Page({ params, searchParams }: any) {
  const rawSlug = params.slug || "";
  const stationCode = extractStationCode(rawSlug).toUpperCase();

  const trainNum = searchParams.train || "";
  const boarding = searchParams.boarding || "";
  const inputDate = searchParams.date || ""; // e.g. "1 Apr 2026"

  let finalDisplayDate = inputDate;
  let arrivalTime = "--:--";
  let stationName = stationCode;
  let restaurants: any[] = [];

  try {
    // 1. Fetch Train Route Logic
    const { data: route } = await serviceClient
      .from("TrainRoute")
      .select("StationCode, StationName, Day, Arrives")
      .eq("trainNumber", trainNum)
      .order("StnNumber", { ascending: true });

    if (route && route.length > 0) {
      const bStn = route.find(r => r.StationCode.toUpperCase() === boarding.toUpperCase());
      const cStn = route.find(r => r.StationCode.toUpperCase() === stationCode);

      if (cStn) {
        stationName = cStn.StationName;
        arrivalTime = formatTime(cStn.Arrives);
        // Essential: Calculate exact date from Train Route Day
        finalDisplayDate = getFinalDate(inputDate, bStn?.Day || 1, cStn.Day || 1);
      }
    }

    // 2. Fetch Restaurants
    const { data: restros } = await serviceClient
      .from("RestroMaster")
      .select("*")
      .eq("StationCode", stationCode)
      .or('RaileatsStatus.eq.Active,IsActive.eq.true');

    restaurants = restros || [];
  } catch (err) {
    console.error("Fetch Error:", err);
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 font-sans">
      
      {/* ✅ HEADER: Fixed Calculation */}
      <div className="bg-[#FFF4F2] border border-orange-100 p-5 rounded-3xl mb-8 flex justify-between items-center">
        <div>
          <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest mb-1">Delivery Date</p>
          <p className="text-xl font-black text-gray-900">{finalDisplayDate || inputDate}</p>
        </div>
        <div className="text-right border-l border-orange-200 pl-6">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Arrival at {stationCode}</p>
          <p className="text-xl font-black text-gray-900">{arrivalTime}</p>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 leading-none">
          Restaurants at <span className="text-orange-500">{stationName}</span>
        </h1>
        <p className="text-sm text-gray-500 mt-2 font-bold">Showing active vendors for your journey</p>
      </div>

      {/* RESTAURANTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {restaurants.length > 0 ? (
          restaurants.map((r) => (
            <div key={r.RestroCode} className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all border-b-4 hover:border-orange-500">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-800 leading-tight">{r.RestroName}</h3>
                <span className="bg-green-600 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-sm">★ {r.RestroRating || "4.2"}</span>
              </div>

              <div className="flex items-center gap-6 mb-6 py-4 border-y border-gray-50">
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Delivery Hours</p>
                  <p className="text-sm font-bold text-gray-700">{formatTime(r.open_time)} - {formatTime(r.closed_time)}</p>
                </div>
                <div className="border-l pl-6">
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Min Order</p>
                  <p className="text-sm font-bold text-gray-700">₹{r.MinimumOrderValue || r.MinimumOrdermValue || "0"}</p>
                </div>
              </div>

              <a
                href={`/Stations/${rawSlug}/${r.RestroCode}-${(r.RestroName || "").replace(/\s+/g, "-")}?date=${finalDisplayDate}&train=${trainNum}&boarding=${boarding}`}
                className="w-full inline-block text-center bg-gray-900 hover:bg-orange-600 text-white font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95"
              >
                SELECT ITEMS
              </a>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-black text-lg uppercase tracking-widest">No Active Restaurants</p>
          </div>
        )}
      </div>
    </main>
  );
}
