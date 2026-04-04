import React from "react";
import { serviceClient } from "../../lib/supabaseServer";

/* helper function */
function formatDate(d: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const dynamic = "force-dynamic";

/* ---------------- Helpers ---------------- */
function formatTime(t?: string | null) {
  if (!t) return "--:--";
  return t.slice(0, 5);
}

function getCalculatedDate(urlDate: string, bDay: number, cDay: number) {
  if (!urlDate) return "";

  try {
    const base = new Date(urlDate + "T00:00:00");

    if (isNaN(base.getTime())) return urlDate;

    const diff = (Number(cDay) || 1) - (Number(bDay) || 1);

    base.setDate(base.getDate() + diff);

    return base.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  } catch (e) {
    console.error("DATE ERROR:", e);
    return urlDate;
  }
}

/* ---------------- Page ---------------- */
export default async function Page(props: { params: Promise<any>, searchParams: Promise<any> }) {
  // Await params
  const resolvedParams = await props.params;
  const resolvedSearchParams = await props.searchParams;

  // --- DEBUG LOGS ---
  console.log("-----------------------------------------");
  console.log("🔍 DEBUG: URL PARAMS RECEIVED:");
  console.log("Slug:", resolvedParams.slug);
  console.log("Train:", resolvedSearchParams.train);
  console.log("Date from URL:", resolvedSearchParams.date);
  console.log("Boarding:", resolvedSearchParams.boarding);
  console.log("-----------------------------------------");

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
    let finalDisplayDate = inputDate || "";
      console.log("📡 FETCHING DATA FROM SUPABASE FOR TRAIN:", trainNum);
      const { data: route, error: routeError } = await serviceClient
        .from("TrainRoute")
        .select("StationCode, StationName, Day, Arrives")
        .or(`trainNumber.eq.${trainNum},trainNumber.eq.${parseInt(trainNum) || 0}`)
      if (routeError) console.error("❌ SUPABASE ROUTE ERROR:", routeError);

      if (route && route.length > 0) {
        const bStn = route.find(
  r => String(r.StationCode || "").toUpperCase().trim() === boarding
);

const cStn = route.find(
  r => String(r.StationCode || "").toUpperCase().trim() === stationCode
);

        console.log("📍 FOUND BOARDING STN:", bStn ? "YES" : "NO");
        console.log("📍 FOUND CURRENT STN:", cStn ? "YES" : "NO");

        if (cStn) {
          stationName = cStn.StationName;
          if (cStn.Arrives) arrivalTime = formatTime(cStn.Arrives);
          finalDisplayDate = getCalculatedDate(inputDate, bStn?.Day || 1, cStn.Day || 1);
        }
      } else {
        console.warn("⚠️ NO ROUTE DATA FOUND IN DB");
      }

    // Restaurants fetch
    const { data: restros } = await serviceClient
      .from("RestroMaster")
      .select("*")
      .eq("StationCode", stationCode)
      .or('RaileatsStatus.eq.Active,IsActive.eq.true');

   const arrivalMin = timeToMinutes(arrivalTime);

restaurants = (restros || []).filter((r: any) => {
  const start = r.open_time?.slice(0, 5) || "00:00";
  const end = r.closed_time?.slice(0, 5) || "23:59";

  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);

  // ✅ ONLY show if train arrives between open-close time
  return arrivalMin >= startMin && arrivalMin <= endMin;
});
  } catch (err) { 
    console.error("❌ CRITICAL PAGE ERROR:", err); 
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      {/* Visual Debugger for you - Ise baad me hata sakte hain */}
      <div className="bg-black text-green-400 p-4 mb-4 rounded-xl text-xs font-mono overflow-auto">
         <p>// DEBUG INFO (Only for development)</p>
         <p>URL Date: {inputDate || "NULL"}</p>
         <p>Calc Date: {finalDisplayDate || "FAILED"}</p>
         <p>Train: {trainNum || "NULL"}</p>
         <p>Boarding: {boarding || "NULL"}</p>
      </div>

      <div className="bg-orange-50 border-2 border-orange-100 p-6 rounded-[2rem] mb-10 flex justify-between items-center shadow-sm">
        <div>
          <p className="text-[10px] text-orange-600 font-black uppercase mb-1">Delivery Date</p>
          <p className="text-2xl font-black text-gray-900">
            {/* AGAR CALCULATION FAIL HUI TOH PURANI DATE DIKHAO */}
            {finalDisplayDate || inputDate || "Date Pending"}
          </p>
        </div>
       
        <div className="text-right border-l-2 border-orange-200 pl-8">
          <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Arrival at {stationCode}</p>
          <p className="text-2xl font-black text-gray-900">{arrivalTime}</p>
        </div>
      </div>

      <h1 className="text-4xl font-black mb-8">
        Food at <span className="text-orange-500">{stationName}</span>
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {restaurants.length > 0 ? (
          restaurants.map((r) => (
            <div key={r.RestroCode} className="bg-white border-2 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all border-b-8 hover:border-orange-500">
              <h3 className="text-2xl font-black mb-4">{r.RestroName}</h3>
              <a
  href={`/menu?restro=${r.RestroCode}&arrival=${arrivalTime}&stationName=${stationName}&train=${trainNum}&halt=--`}
  className="block w-full text-center bg-gray-900 text-white font-black py-4 rounded-2xl"
>
  VIEW MENU
</a>
            </div>
          ))
        ) : (
          <p>No vendors found.</p>
        )}
      </div>
    </main>
  );
}
function timeToMinutes(t: string) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
