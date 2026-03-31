import React from "react";
import { extractStationCode } from "../../lib/stationSlug";
import { serviceClient } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------------- Helpers ---------------- */
function formatTime(t?: string | null) {
  if (!t) return "--:--";
  return t.slice(0, 5);
}

// 100% Robust Date Calculation
function getCalculatedDate(urlDate: string, boardingDay: number, currentDay: number) {
  try {
    if (!urlDate) return "";
    
    // Parse "1 Apr 2026" or "2026-04-01"
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let d: Date;

    if (urlDate.includes("-")) {
      d = new Date(urlDate);
    } else {
      const parts = urlDate.split(" ");
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const monthIdx = months.findIndex(m => m.toLowerCase() === parts[1].toLowerCase().slice(0, 3));
        const year = parseInt(parts[2]);
        d = new Date(year, monthIdx, day);
      } else {
        d = new Date(urlDate);
      }
    }

    if (isNaN(d.getTime())) return urlDate;

    // Apply Day Difference from Train Route
    const diff = (currentDay || 1) - (boardingDay || 1);
    d.setDate(d.getDate() + diff);

    const fDay = String(d.getDate()).padStart(2, '0');
    const fMonth = months[d.getMonth()];
    return `${fDay} ${fMonth} ${d.getFullYear()}`;
  } catch (e) {
    return urlDate;
  }
}

/* ---------------- Page ---------------- */
export default async function Page({ params, searchParams }: any) {
  // Fix for Next.js 15+ Async Params
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const rawSlug = resolvedParams.slug || "";
  const stationCode = extractStationCode(rawSlug).toUpperCase();

  // Important Params from URL
  const trainNum = resolvedSearchParams.train || "";
  const boarding = resolvedSearchParams.boarding || "";
  const dateFromUrl = resolvedSearchParams.date || "";

  let finalDate = dateFromUrl;
  let arrivalTime = "--:--";
  let stationName = stationCode;
  let restaurants: any[] = [];

  try {
    // 1. DATA FROM TRAIN ROUTE (THE BRAIN)
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
        // Calculation based on Route Day
        finalDate = getCalculatedDate(dateFromUrl, bStn?.Day || 1, cStn.Day || 1);
      }
    }

    // 2. FETCH RESTAURANTS
    const { data: restros } = await serviceClient
      .from("RestroMaster")
      .select("*")
      .eq("StationCode", stationCode)
      .or('RaileatsStatus.eq.Active,IsActive.eq.true');

    restaurants = restros || [];
  } catch (err) {
    console.error("Error fetching station data:", err);
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      
      {/* HEADER CARD */}
      <div className="bg-gradient-to-r from-orange-50 to-white border-2 border-orange-100 p-6 rounded-[2rem] mb-10 flex flex-wrap justify-between items-center shadow-sm">
        <div className="flex items-center gap-6">
          <div className="bg-orange-500 text-white p-4 rounded-2xl shadow-lg shadow-orange-200">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Date</p>
            <p className="text-xl font-black">{finalDate || "Not Set"}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Station Code</p>
            <p className="text-xl font-black text-gray-800">{stationCode}</p>
          </div>
        </div>
        
        <div className="text-right border-l-2 border-gray-100 pl-8">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Arrival Time</p>
          <p className="text-2xl font-black text-gray-900">{arrivalTime}</p>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
          Food at <span className="text-orange-500">{stationName}</span>
        </h1>
        <p className="text-gray-500 font-bold mt-2">Pick a restaurant to view menu and order.</p>
      </div>

      {/* RESTAURANTS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        {restaurants.length > 0 ? (
          restaurants.map((r) => (
            <div key={r.RestroCode} className="bg-white border-2 border-gray-50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-black text-gray-800 tracking-tight">{r.RestroName}</h3>
                <div className="bg-green-600 text-white px-3 py-1 rounded-xl text-xs font-black shadow-lg shadow-green-100">
                  ★ {r.RestroRating || "4.2"}
                </div>
              </div>

              <div className="flex gap-8 mb-8 py-6 border-y border-gray-50">
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Service</p>
                  <p className="text-sm font-black text-gray-700">{formatTime(r.open_time)} - {formatTime(r.closed_time)}</p>
                </div>
                <div className="border-l-2 border-gray-50 pl-8">
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Min. Order</p>
                  <p className="text-sm font-black text-gray-700">₹{r.MinimumOrderValue || r.MinimumOrdermValue || "0"}</p>
                </div>
              </div>

              <a
                href={`/Stations/${rawSlug}/${r.RestroCode}-${(r.RestroName || "").replace(/\s+/g, "-")}?date=${encodeURIComponent(finalDate)}&train=${trainNum}&boarding=${boarding}`}
                className="w-full inline-block text-center bg-gray-900 hover:bg-orange-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95"
              >
                SELECT ITEMS
              </a>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100">
            <p className="text-gray-400 font-black text-lg uppercase tracking-widest italic">No vendors available at this time</p>
          </div>
        )}
      </div>
    </main>
  );
}
