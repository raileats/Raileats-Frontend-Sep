import React from "react";
import { extractStationCode } from "../../lib/stationSlug";
import { serviceClient } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";

/* ---------------- Helpers ---------------- */
function formatTime(t?: string | null) {
  if (!t) return "--:--";
  return t.slice(0, 5);
}

// Deep Date Calculation Logic
function getFinalDate(searchDate: string, boardingDay: number, currentDay: number) {
  if (!searchDate) return "";
  
  try {
    // Agar date "1 Apr 2026" format mein hai
    const dateParts = searchDate.split(" ");
    let d: Date;

    if (dateParts.length === 3) {
      // Manual parsing for "1 Apr 2026"
      const day = parseInt(dateParts[0]);
      const monthStr = dateParts[1].toLowerCase();
      const year = parseInt(dateParts[2]);
      const months: any = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
      d = new Date(year, months[monthStr.slice(0,3)], day);
    } else {
      d = new Date(searchDate);
    }

    if (isNaN(d.getTime())) return searchDate;

    // Train Route Day Logic
    const diff = (currentDay || 1) - (boardingDay || 1);
    d.setDate(d.getDate() + diff);

    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
  const inputDate = searchParams.date || "";

  let displayDate = inputDate;
  let arrivalTime = "--:--";
  let stationName = stationCode;
  let restaurants: any[] = [];

  try {
    // 1. Fetch Train Route (The Source of Truth)
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
        // Calculate date using Train Route Day difference
        displayDate = getFinalDate(inputDate, bStn?.Day || 1, cStn.Day || 1);
      }
    }

    // 2. Fetch Restaurants directly
    const { data: restros } = await serviceClient
      .from("RestroMaster")
      .select("*")
      .eq("StationCode", stationCode)
      .or('RaileatsStatus.eq.Active,IsActive.eq.true');

    restaurants = restros || [];
  } catch (err) {
    console.error("Critical Error:", err);
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      
      {/* ✅ HEADER SECTION - Ab ye kabhi khali nahi aayega */}
      <div className="bg-orange-50 border border-orange-200 p-5 rounded-2xl mb-8 flex justify-between items-center shadow-sm">
        <div className="flex flex-col">
          <span className="text-[10px] text-orange-600 font-black uppercase tracking-widest mb-1">Delivery Date</span>
          <span className="text-xl font-black text-gray-900">{displayDate || "Date Missing"}</span>
        </div>
        <div className="text-right border-l border-orange-200 pl-6">
          <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Arrival At {stationCode}</span>
          <span className="text-xl font-black text-gray-900">{arrivalTime}</span>
        </div>
      </div>

      <h1 className="text-3xl font-black mb-2 text-gray-900">
        Restaurants at {stationName}
      </h1>
      <p className="text-gray-500 mb-8 font-medium">Fresh food delivery in train at your seat</p>

      {/* RESTAURANT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {restaurants.length > 0 ? (
          restaurants.map((r) => (
            <div key={r.RestroCode} className="border border-gray-100 bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-extrabold text-gray-800">{r.RestroName}</h3>
                <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg">★ {r.RestroRating || "4.2"}</span>
              </div>

              <div className="flex items-center gap-6 mb-6">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Open Hours</p>
                  <p className="text-sm font-bold text-gray-700">{formatTime(r.open_time)} - {formatTime(r.closed_time)}</p>
                </div>
                <div className="border-l pl-6">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Min Order</p>
                  <p className="text-sm font-bold text-gray-700">₹{r.MinimumOrderValue || r.MinimumOrdermValue || "0"}</p>
                </div>
              </div>

              <a
                href={`/Stations/${rawSlug}/${r.RestroCode}-${(r.RestroName || "").replace(/\s+/g, "-")}?date=${displayDate}&train=${trainNum}&boarding=${boarding}`}
                className="w-full inline-block text-center bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-orange-100"
              >
                SELECT & ORDER
              </a>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-bold text-lg">No active restaurants found at this station.</p>
          </div>
        )}
      </div>
    </main>
  );
}
