import React from "react";
import { extractStationCode } from "../../lib/stationSlug";
import { serviceClient } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";

/* ---------------- Helpers ---------------- */
function formatTime(t?: string | null) {
  if (!t) return "--:--";
  return t.slice(0, 5);
}

// 100% Reliable Date Logic
function getCalculatedDate(urlDate: string, bDay: number, cDay: number) {
  if (!urlDate) return "";
  try {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let d: Date;

    // Handle "1 Apr 2026" or "2026-04-01"
    const parts = urlDate.split(" ");
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const monthIdx = months.findIndex(m => m.toLowerCase() === parts[1].toLowerCase().slice(0, 3));
      const year = parseInt(parts[2]);
      d = new Date(year, monthIdx, day);
    } else {
      d = new Date(urlDate);
    }

    if (isNaN(d.getTime())) return urlDate;

    // Diff calculation from Train Route Days
    const diff = (cDay || 1) - (bDay || 1);
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
  // Support for both Next 14 and 15
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const rawSlug = resolvedParams.slug || "";
  const stationCode = extractStationCode(rawSlug).toUpperCase();

  // Params from URL
  const trainNum = resolvedSearchParams.train || "";
  const boarding = resolvedSearchParams.boarding || "";
  const dateFromUrl = resolvedSearchParams.date || "";

  let finalDate = dateFromUrl;
  let arrivalTime = "--:--";
  let stationName = stationCode;
  let restaurants: any[] = [];

  try {
    // 1. Logic via Train Route
    if (trainNum) {
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
          finalDate = getCalculatedDate(dateFromUrl, bStn?.Day || 1, cStn.Day || 1);
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
  } catch (err) {
    console.error("Error loading station page:", err);
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      
      {/* HEADER: CALCULATED DATE */}
      <div className="bg-white border-2 border-orange-100 p-6 rounded-3xl mb-10 flex justify-between items-center shadow-sm">
        <div className="flex flex-col">
          <span className="text-[10px] text-orange-500 font-black uppercase tracking-widest mb-1">Delivery Date</span>
          <span className="text-2xl font-black text-gray-900">{finalDate || "Not Available"}</span>
        </div>
        <div className="text-right flex flex-col border-l-2 border-orange-50 pl-8">
          <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Train Arrival</span>
          <span className="text-2xl font-black text-gray-900">{arrivalTime}</span>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-black text-gray-900">
          Restaurants at <span className="text-orange-600">{stationName}</span>
        </h1>
        <p className="text-gray-500 font-bold mt-2 italic text-sm">Fresh and hygienic food delivery in train</p>
      </div>

      {/* RESTAURANT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {restaurants.length > 0 ? (
          restaurants.map((r) => (
            <div key={r.RestroCode} className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all border-b-8 hover:border-orange-500">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-black text-gray-800 tracking-tight">{r.RestroName}</h3>
                <span className="bg-green-600 text-white text-[10px] font-black px-2 py-1 rounded-lg">★ {r.RestroRating || "4.2"}</span>
              </div>

              <div className="flex gap-10 mb-8 py-4 border-y border-gray-50">
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-1 tracking-widest">Timings</p>
                  <p className="text-sm font-black text-gray-700">{formatTime(r.open_time)} - {formatTime(r.closed_time)}</p>
                </div>
                <div className="border-l-2 border-gray-50 pl-10">
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-1 tracking-widest">Min. Order</p>
                  <p className="text-sm font-black text-gray-700">₹{r.MinimumOrderValue || r.MinimumOrdermValue || "0"}</p>
                </div>
              </div>

              <a
                href={`/Stations/${rawSlug}/${r.RestroCode}-${(r.RestroName || "").replace(/\s+/g, "-")}?date=${encodeURIComponent(finalDate)}&train=${trainNum}&boarding=${boarding}`}
                className="w-full inline-block text-center bg-gray-900 text-white font-black py-5 rounded-2xl transition-all hover:bg-orange-600 shadow-xl"
              >
                VIEW MENU
              </a>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-200">
            <p className="text-gray-400 font-black text-lg">NO VENDORS FOUND FOR THIS STATION</p>
          </div>
        )}
      </div>
    </main>
  );
}
