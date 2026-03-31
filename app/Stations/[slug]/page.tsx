import React from "react";
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
    const diff = (cDay || 1) - (bDay || 1);
    d.setDate(d.getDate() + diff);
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) { 
    return urlDate; 
  }
}

/* ---------------- Page ---------------- */
export default async function Page(props: { params: Promise<any>, searchParams: Promise<any> }) {
  const resolvedParams = await props.params;
  const resolvedSearchParams = await props.searchParams;

  const slug = resolvedParams.slug || "";
  const stationCode = slug.split('-')[0].toUpperCase();
  const trainNum = resolvedSearchParams.train || "";
  const boarding = (resolvedSearchParams.boarding || "").toUpperCase();
  const inputDate = resolvedSearchParams.date || ""; 

  let finalDisplayDate = "";
  let arrivalTime = resolvedSearchParams.arrival || "--:--";
  let stationName = resolvedSearchParams.stationName || stationCode;
  let restaurants: any[] = [];

  try {
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
          finalDisplayDate = getCalculatedDate(inputDate, bStn?.Day || 1, cStn.Day || 1);
        }
      }
    }
    const { data: restros } = await serviceClient
      .from("RestroMaster")
      .select("*")
      .eq("StationCode", stationCode)
      .or('RaileatsStatus.eq.Active,IsActive.eq.true');

    restaurants = restros || [];
  } catch (err) { 
    console.error(err); 
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="bg-black text-green-400 p-4 mb-4 rounded-xl text-xs font-mono">
         <p>// DEBUG INFO</p>
         <p>URL Date: {inputDate || "NULL"}</p>
         <p>Calc Date: {finalDisplayDate || "FAILED"}</p>
      </div>

      <div className="bg-orange-50 border-2 border-orange-100 p-6 rounded-[2rem] mb-10 flex justify-between items-center shadow-sm">
        <div>
          <p className="text-[10px] text-orange-600 font-black uppercase mb-1 tracking-widest">Delivery Date</p>
          <p className="text-2xl font-black text-gray-900">{finalDisplayDate || inputDate || "Date Pending"}</p>
        </div>
        <div className="text-right border-l-2 border-orange-200 pl-8">
          <p className="text-[10px] text-gray-400 font-black uppercase mb-1 tracking-widest">Arrival at {stationCode}</p>
          <p className="text-2xl font-black text-gray-900">{arrivalTime}</p>
        </div>
      </div>

      <h1 className="text-4xl font-black mb-8">Restaurants at <span className="text-orange-500">{stationName}</span></h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {restaurants.map((r) => (
          <div key={r.RestroCode} className="bg-white border-2 p-8 rounded-[2.5rem] shadow-sm">
            <h3 className="text-2xl font-black mb-4">{r.RestroName}</h3>
            <button className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl">VIEW MENU</button>
          </div>
        ))}
      </div>
    </main>
  );
}
