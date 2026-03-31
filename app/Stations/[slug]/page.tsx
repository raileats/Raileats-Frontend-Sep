import React from "react";
import { extractStationCode } from "../../lib/stationSlug";
import { serviceClient } from "../../lib/supabaseServer";

// Force Next.js to not cache this page
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------------- Helpers ---------------- */
function formatTime(t?: string | null) {
  if (!t) return "--:--";
  return t.slice(0, 5);
}

// Manual Date Calculation that NEVER fails
function getFinalDate(searchDate: string, bDay: number, cDay: number) {
  if (!searchDate) return "";
  try {
    const parts = searchDate.split(" "); 
    if (parts.length !== 3) return searchDate;

    const day = parseInt(parts[0]);
    const monthStr = parts[1];
    const year = parseInt(parts[2]);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIdx = months.findIndex(m => m.toLowerCase() === monthStr.toLowerCase().slice(0, 3));

    const d = new Date(year, monthIdx, day);
    const diff = (cDay || 1) - (bDay || 1);
    d.setDate(d.getDate() + diff);

    const fDay = String(d.getDate()).padStart(2, '0');
    const fMonth = months[d.getMonth()];
    return `${fDay} ${fMonth} ${d.getFullYear()}`;
  } catch (e) { return searchDate; }
}

/* ---------------- Page ---------------- */
export default async function Page({ params, searchParams }: any) {
  // Await params if using Next.js 15
  const { slug } = await params;
  const sParams = await searchParams;

  const rawSlug = slug || "";
  const stationCode = extractStationCode(rawSlug).toUpperCase();

  const trainNum = sParams.train || "";
  const boarding = sParams.boarding || "";
  const inputDate = sParams.date || "";

  console.log("DEBUG: Station Page Load ->", { stationCode, trainNum, boarding, inputDate });

  let finalDisplayDate = inputDate;
  let arrivalTime = "--:--";
  let stationName = stationCode;
  let restaurants: any[] = [];

  try {
    // 1. Fetch Train Route (Slug Power)
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
        // Train Route se Day compare karke final date nikalna
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
    console.error("Critical Error on Station Page:", err);
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 font-sans">
      
      {/* ✅ SOLID DATE HEADER */}
      <div className="bg-[#FFF8F6] border-2 border-orange-100 p-6 rounded-[2rem] mb-8 flex justify-between items-center shadow-sm">
        <div>
          <p className="text-[10px] text-orange-500 font-black uppercase tracking-[0.2em] mb-2">Delivery Date</p>
          <p className="text-2xl font-black text-gray-900">{finalDisplayDate || inputDate || "Loading..."}</p>
        </div>
        <div className="text-right border-l-2 border-orange-100 pl-8">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2">Arrival at {stationCode}</p>
          <p className="text-2xl font-black text-gray-900">{arrivalTime}</p>
        </div>
      </div>

      <div className="mb-10">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
          Restaurants at <span className="text-orange-500">{stationName}</span>
        </h1>
        <p className="text-gray-500 font-bold mt-2">Get hot meals delivered right at your seat.</p>
      </div>

      {/* RESTAURANT LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {restaurants.length > 0 ? (
          restaurants.map((r) => (
            <div key={r.RestroCode} className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 group border-b-8 hover:border-orange-500">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-black text-gray-800 group-hover:text-orange-500 transition-colors">{r.RestroName}</h3>
                <span className="bg-green-600 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-lg shadow-green-100">★ {r.RestroRating || "4.2"}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 py-6 border-y border-gray-50 mb-8">
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Service Time</p>
                  <p className="text-sm font-black text-gray-700">{formatTime(r.open_time)} - {formatTime(r.closed_time)}</p>
                </div>
                <div className="border-l pl-6">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Min. Order</p>
                  <p className="text-sm font-black text-gray-700">₹{r.MinimumOrderValue || r.MinimumOrdermValue || "0"}</p>
                </div>
              </div>

              <a
                href={`/Stations/${rawSlug}/${r.RestroCode}-${(r.RestroName || "").replace(/\s+/g, "-")}?date=${encodeURIComponent(finalDisplayDate)}&train=${trainNum}&boarding=${boarding}`}
                className="w-full inline-flex justify-center items-center bg-gray-900 hover:bg-orange-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95"
              >
                SELECT & ORDER
              </a>
            </div>
          ))
        ) : (
          <div className="col-span-full py-24 text-center bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100">
            <p className="text-gray-400 font-black text-xl uppercase tracking-widest">No Active Vendors Found</p>
          </div>
        )}
      </div>
    </main>
  );
}
