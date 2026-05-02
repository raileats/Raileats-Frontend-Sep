import React from "react";
import { extractStationCode } from "../../../lib/stationSlug";
import { extractRestroCode } from "../../../lib/restroSlug";
import RestroMenuClient from "./RestroMenuClient";

export const revalidate = 60;
export const runtime = "nodejs";

/* ------------ HELPERS ------------ */
function humanizeFromSlug(restroSlug: string) {
  return decodeURIComponent(restroSlug)
    .replace(/^\d+-/, "")
    .replace(/-\d+$/, "")
    .replace(/-/g, " ")
    .trim()
    .split(" ")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

/* ------------ FETCH ------------ */
async function fetchOnMenu(
  restroCode: string | number,
  arrivalTime: string
) {
  try {
    const res = await fetch(
      `https://raileats.in/api/restro-menu?restro=${restroCode}&arrivalTime=${arrivalTime}`,
      { cache: "no-store" }
    );

    const json = await res.json();
    return json?.items || [];
  } catch (e) {
    return [];
  }
}

/* ------------ TIME CHECK ------------ */
function isTimeInRange(arrival: string, start?: string, end?: string) {
  if (!start || !end) return true;

  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const a = toMin(arrival.slice(0, 5));
  const s = toMin(start.slice(0, 5));
  const e = toMin(end.slice(0, 5));

  // ✅ normal case
  if (s <= e) {
    return a >= s && a <= e;
  }

  // ✅ overnight case (22:00 → 02:00)
  return a >= s || a <= e;
}

/* ------------ PAGE ------------ */
export default async function Page({ params, searchParams }: any) {

  const stationCode = extractStationCode(params.slug) || "";
  const restroCode = extractRestroCode(params.restroSlug) || "";
  const outletName = humanizeFromSlug(params.restroSlug);

  const stationName =
    params.slug?.split("-")?.slice(1)?.join(" ") || stationCode;

  /* 🔥 URL DATA */
  const deliveryDate =
    searchParams?.deliveryDate || searchParams?.date || "";

  const deliveryTime =
    searchParams?.deliveryTime ||
    searchParams?.arrival?.slice(0, 5) ||
    searchParams?.arrivalTime?.slice(0, 5) ||
    "";

  const trainName = searchParams?.trainName || "";
  let arrivalTime = "12:00:00";

if (deliveryTime) {
  const clean = deliveryTime.slice(0, 5);
  arrivalTime = clean + ":00";
}
  /* ================= FETCH ================= */

  const rawItems = await fetchOnMenu(restroCode, arrivalTime);

  /* ================= FILTER ================= */

  const items = (rawItems || [])
    .map((it: any) => ({
      id: Number(it?.id),
      item_name: it?.item_name || "",
      base_price: Number(it?.base_price || 0),
      item_category: it?.item_category || "",
      item_description: it?.item_description || it?.description || "",
      start_time: it?.start_time || it?.item_start_time || null,
      end_time: it?.end_time || it?.item_end_time || null,
      status: String(it?.status || "ON").toUpperCase(),
    }))
    .filter((it: any) => {
      if (it.status !== "ON") return false;
      return isTimeInRange(arrivalTime, it.start_time, it.end_time);
    });

  const header = {
    stationCode,
    restroCode: String(restroCode),
    outletName,
    stationName,
  };

  const nextParams = {
    stationName,
    stationCode,
    deliveryDate,
    deliveryTime,
    trainName,
    vendorName: outletName,
  };

  return (
    <main className="container-app">

      {/* ✅ NEW CLEAN HEADER */}
      <div className="mb-4 rounded-xl border border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50 p-4 shadow-sm">

  <div className="grid grid-cols-2 gap-4 items-start">

    {/* LEFT → Journey */}
    <div>
      <div className="text-xs text-gray-500 font-medium">Journey</div>

      <div className="text-base font-bold text-orange-700">
        {trainName || "Train"}
      </div>

      <div className="text-xs text-gray-600">
        #{searchParams?.train || ""}
      </div>

      <div className="mt-1 text-sm font-medium text-gray-800">
        {stationName} ({stationCode})
      </div>
    </div>

    {/* RIGHT → Delivery */}
    <div className="text-right">
      <div className="text-xs text-gray-500 font-medium">Delivery</div>

      <div className="text-base font-bold text-blue-700">
        {deliveryDate} {deliveryTime && `at ${deliveryTime}`}
      </div>

      <div className="text-sm text-gray-800 font-medium">
        {outletName}
      </div>
    </div>

  </div>
</div>

      <RestroMenuClient
        header={header}
        items={items}
        nextParams={nextParams}
      />

    </main>
  );
}
