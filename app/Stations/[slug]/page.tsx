import React from "react";
import { extractStationCode } from "../../lib/stationSlug";
import { serviceClient } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";

/* ---------------- Helpers ---------------- */
function formatTime(t?: string | null) {
  if (!t) return "--:--";
  return t.slice(0, 5);
}

function getCalculatedDate(urlDate: string, bDay: number, cDay: number) {
  if (!urlDate) return "";
  try {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const parts = urlDate.split(" ");
    let d: Date;

    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const monthIdx = months.findIndex(m => m.toLowerCase() === parts[1].toLowerCase().slice(0, 3));
      const year = parseInt(parts[2]);
      d = new Date(year, monthIdx, day);
    } else {
      d = new Date(urlDate);
    }

    if (isNaN(d.getTime())) return urlDate;

    // Train Route Day Calculation
    const diff = (cDay || 1) - (bDay || 1);
    d.setDate(d.getDate() + diff);

    const fDay = String(d.getDate()).padStart(2, '0');
    const fMonth = months[d.getMonth()];
    return `${fDay} ${fMonth} ${d.getFullYear()}`;
  } catch (e) { return urlDate; }
}

/* ---------------- Page ---------------- */
export default async function Page({ params, searchParams }: any) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const rawSlug = resolvedParams.slug || "";
  const stationCode = extractStationCode(rawSlug).toUpperCase();

  const trainNum = resolvedSearchParams.train || "";
  const boarding = resolvedSearchParams.boarding || "";
  const inputDate = resolvedSearchParams.date || ""; 

  let finalDisplayDate = inputDate;
  let arrivalTime = resolvedSearchParams.arrival || "--:--";
  let stationName = stationCode;
  let restaurants: any[] = [];

  try {
    // 1. Calculate Date using Train Route Days
    if (trainNum && inputDate) {
      const { data: route } = await serviceClient
        .from("TrainRoute")
        .select("StationCode, StationName, Day, Arrives")
        .eq("trainNumber", trainNum);

      if (route && route.length > 0) {
        const bStn = route.find(r => r.StationCode.toUpperCase() === boarding.toUpperCase());
        const cStn = route.find(r => r.StationCode.toUpperCase() === stationCode);

        if (cStn) {
          stationName = cStn.StationName;
          if (cStn.Arrives) arrivalTime = formatTime(cStn.Arrives);
          finalDisplayDate = getCalculatedDate(inputDate, bStn?.Day || 1, cStn.Day || 1);
        }
      }
    }

    // 2. Fetch Restaurants
    const { data: restros } = await serviceClient
      .from("RestroMaster")
      .select("*")
      .eq("StationCode", stationCode)
      .or('RaileatsStatus.eq.Active,IsActive.eq.true');

    restaurants = restros || [];
  } catch (err) { console.error(err); }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      {/* HEADER CARD */}
      <div className="bg-orange-50 border-2 border-orange-100 p-6 rounded-3xl mb-10 flex justify-between items-center shadow-sm">
        <div>
          <p className="text-[10px] text-orange-600 font-black uppercase mb-1">Delivery Date</p>
          <p className="text-2xl font-black text-gray-900">{finalDisplayDate || inputDate || "Select Date"}</p>
        </div>
        <div className="text-right border-l-2 border-orange-200 pl-8">
          <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Expected Arrival</p>
          <p className="text-2xl font-black text-gray-900">{arrivalTime}</p>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-black text-gray-900">
          Order Food at <span className="text-orange-500">{stationName}</span>
        </h1>
        <p className="text-gray-500 font-bold mt-1">Fresh & Hygienic food delivery at your seat</p>
      </div>

      {/* RESTAURANTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {restaurants.length > 0 ? restaurants.map((r) => (
          <div key={r.RestroCode} className="bg-white border-2 border-gray-50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all border-b-8 hover:border-orange-500">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-gray-800">{r.RestroName}</h3>
              <span className="bg-green-600 text-white text-[10px] font-black px-2 py-1 rounded-lg">★ {r.RestroRating || "4.2"}</span>
            </div>
            
            <div className="flex gap-8 mb-8 py-4 border-y border-gray-50">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-widest">Service</p>
                <p className="text-sm font-bold text-gray-700">{formatTime(r.open_time)} - {formatTime(r.closed_time)}</p>
              </div>
              <div className="border-l-2 border-gray-50 pl-8">
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-widest">Min Order</p>
                <p className="text-sm font-bold text-gray-700">₹{r.MinimumOrderValue || "0"}</p>
              </div>
            </div>

            <button className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl hover:bg-orange-600 shadow-xl transition-all">
              VIEW MENU & ORDER
            </button>
          </div>
        )) : (
          <p className="col-span-full py-20 text-center text-gray-400 font-bold">No active restaurants found at this station.</p>
        )}
      </div>
    </main>
  );
}
