import React from "react";
import { serviceClient } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";

// Time format helper
function formatTime(t?: string | null) {
  if (!t) return "--:--";
  return t.slice(0, 5);
}

// Date Calculation Logic
function getCalculatedDate(urlDate: string, bDay: number, cDay: number) {
  if (!urlDate) return "";
  try {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let d: Date;

    if (urlDate.includes(" ")) {
      const parts = urlDate.split(" ");
      const day = parseInt(parts[0]);
      const monthIdx = months.findIndex(m => m.toLowerCase().startsWith(parts[1].toLowerCase().slice(0, 3)));
      const year = parseInt(parts[2]);
      d = new Date(year, monthIdx, day);
    } else {
      d = new Date(urlDate);
    }

    if (isNaN(d.getTime())) return urlDate;

    // Difference between Boarding Day and Station Day
    const diff = (cDay || 1) - (bDay || 1);
    d.setDate(d.getDate() + diff);

    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) { 
    return urlDate; 
  }
}

export default async function Page(props: { params: Promise<any>, searchParams: Promise<any> }) {
  // 1. Next.js 15 style await (Most Important Fix)
  const resolvedParams = await props.params;
  const resolvedSearchParams = await props.searchParams;

  const slug = resolvedParams.slug || "";
  // RTM-RATLAM jaisa slug hai toh sirf RTM uthayega
  const stationCode = slug.split('-')[0].toUpperCase();

  const trainNum = resolvedSearchParams.train || "";
  const boarding = (resolvedSearchParams.boarding || "").toUpperCase();
  const inputDate = resolvedSearchParams.date || ""; 

  let finalDisplayDate = inputDate; // Default to search date
  let arrivalTime = resolvedSearchParams.arrival || "--:--";
  let stationName = resolvedSearchParams.stationName || stationCode;
  let restaurants: any[] = [];

  try {
    // 2. Fetch Train Route to calculate exact Day Date
    if (trainNum && inputDate && boarding) {
      const { data: route } = await serviceClient
        .from("TrainRoute")
        .select("StationCode, StationName, Day, Arrives")
        .eq("trainNumber", trainNum);

      if (route && route.length > 0) {
        const bStn = route.find(r => r.StationCode.toUpperCase() === boarding);
        const cStn = route.find(r => r.StationCode.toUpperCase() === stationCode);

        if (cStn) {
          stationName = cStn.StationName;
          if (cStn.Arrives) arrivalTime = formatTime(cStn.Arrives);
          // Actual calculation
          finalDisplayDate = getCalculatedDate(inputDate, bStn?.Day || 1, cStn.Day || 1);
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
    console.error("Critical Page Error:", err); 
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      {/* 4. HEADER: Isme ab data 100% dikhega */}
      <div className="bg-orange-50 border-2 border-orange-100 p-6 rounded-[2rem] mb-10 flex justify-between items-center shadow-sm">
        <div>
          <p className="text-[10px] text-orange-600 font-black uppercase mb-1 tracking-widest">Delivery Date</p>
          <p className="text-2xl font-black text-gray-900">
            {/* Fallback logic: Agar calculation fail hui toh inputDate dikhao */}
            {finalDisplayDate || inputDate || "Select Date"}
          </p>
        </div>
        <div className="text-right border-l-2 border-orange-200 pl-8">
          <p className="text-[10px] text-gray-400 font-black uppercase mb-1 tracking-widest">Arrival at {stationCode}</p>
          <p className="text-2xl font-black text-gray-900">{arrivalTime}</p>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-black text-gray-900 leading-tight">
          Restaurants at <span className="text-orange-500">{stationName}</span>
        </h1>
        <p className="text-gray-500 font-bold mt-2 italic text-sm">Delicious food delivered to your train seat</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {restaurants.length > 0 ? (
          restaurants.map((r) => (
            <div key={r.RestroCode} className="bg-white border-2 border-gray-50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all border-b-8 hover:border-orange-500">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-black text-gray-800 tracking-tight">{r.RestroName}</h3>
                <span className="bg-green-600 text-white text-[10px] font-black px-2 py-1 rounded-lg">★ {r.RestroRating || "4.2"}</span>
              </div>

              <div className="flex gap-10 mb-8 py-4 border-y border-gray-50">
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-1 tracking-widest">Min. Order</p>
                  <p className="text-sm font-black text-gray-700">₹{r.MinimumOrderValue || "0"}</p>
                </div>
                <div className="border-l-2 border-gray-50 pl-10">
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-1 tracking-widest">Timings</p>
                  <p className="text-sm font-black text-gray-700">{formatTime(r.open_time)} - {formatTime(r.closed_time)}</p>
                </div>
              </div>

              <button className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl transition-all hover:bg-orange-600 shadow-xl">
                VIEW MENU
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-200">
            <p className="text-gray-400 font-black text-lg uppercase tracking-widest">No Vendors Found</p>
          </div>
        )}
      </div>
    </main>
  );
}
