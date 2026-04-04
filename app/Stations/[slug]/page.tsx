import React from "react";
import { serviceClient } from "../../lib/supabaseServer";

export const dynamic = "force-dynamic";

/* ================= HELPERS ================= */

function formatTime(t?: string | null) {
  if (!t) return "--:--";
  return t.slice(0, 5);
}

function timeToMinutes(t: string) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
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

  } catch {
    return urlDate;
  }
}

/* ================= PAGE ================= */

export default async function Page(props: {
  params: Promise<any>;
  searchParams: Promise<any>;
}) {

  const resolvedParams = await props.params;
  const resolvedSearchParams = await props.searchParams;

  const slug = resolvedParams.slug || "";
  const stationCode = slug.split("-")[0].toUpperCase();

  const trainNum = resolvedSearchParams.train || "";
  const boarding = (resolvedSearchParams.boarding || "").toUpperCase();
  const inputDate = resolvedSearchParams.date || "";

  let arrivalTime = resolvedSearchParams.arrival || "--:--";
  let stationName = resolvedSearchParams.stationName || stationCode;
  let restaurants: any[] = [];
  let finalDisplayDate = inputDate || "";

  try {
    /* ================= TRAIN ROUTE ================= */

    const { data: route } = await serviceClient
      .from("TrainRoute")
      .select("StationCode, StationName, Day, Arrives")
      .or(`trainNumber.eq.${trainNum},trainNumber.eq.${parseInt(trainNum) || 0}`);

    if (route && route.length > 0) {
      const bStn = route.find(
        (r) => String(r.StationCode).toUpperCase().trim() === boarding
      );

      const cStn = route.find(
        (r) => String(r.StationCode).toUpperCase().trim() === stationCode
      );

      if (cStn) {
        stationName = cStn.StationName;

        if (cStn.Arrives) {
          arrivalTime = formatTime(cStn.Arrives);
        }

        finalDisplayDate = getCalculatedDate(
          inputDate,
          bStn?.Day || 1,
          cStn.Day || 1
        );
      }
    }

    /* ================= RESTAURANTS ================= */

    const { data: restros } = await serviceClient
      .from("RestroMaster")
      .select("*")
      .eq("StationCode", stationCode)
      .or("RaileatsStatus.eq.Active,IsActive.eq.true");

    const arrivalMin = timeToMinutes(arrivalTime || "00:00");

    restaurants = (restros || []).filter((r: any) => {
      const start = r.open_time?.slice(0, 5) || "00:00";
      const end = r.closed_time?.slice(0, 5) || "23:59";

      const startMin = timeToMinutes(start);
      const endMin = timeToMinutes(end);

      return arrivalMin >= startMin && arrivalMin <= endMin;
    });

  } catch (err) {
    console.error("PAGE ERROR:", err);
  }

  /* ================= UI ================= */

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">

      <div className="bg-orange-50 border p-6 rounded-xl mb-8 flex justify-between">
        <div>
          <p className="text-sm text-gray-500">Delivery Date</p>
          <p className="text-xl font-bold">
            {finalDisplayDate || inputDate || "Date Pending"}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Arrival</p>
          <p className="text-xl font-bold">{arrivalTime}</p>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-6">
        Food at {stationName}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {restaurants.length > 0 ? (
          restaurants.map((r) => (
            <div
              key={r.RestroCode}
              className="border p-5 rounded-xl shadow-sm"
            >
              <h3 className="text-lg font-semibold mb-3">
                {r.RestroName}
              </h3>

              <a
                href={`/menu?restro=${r.RestroCode}&arrival=${arrivalTime}&stationName=${stationName}&train=${trainNum}&halt=--`}
                className="block text-center bg-black text-white py-2 rounded"
              >
                Order Now
              </a>
            </div>
          ))
        ) : (
          <div>No restaurants available for this time</div>
        )}
      </div>

    </main>
  );
}
