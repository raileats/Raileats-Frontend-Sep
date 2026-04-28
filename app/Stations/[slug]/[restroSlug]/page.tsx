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
    console.log("🔥 CALLING API:", restroCode, arrivalTime);

    const res = await fetch(
      `https://raileats.in/api/restro-menu?restro=${restroCode}&arrivalTime=${arrivalTime}`,
      { cache: "no-store" }
    );

    const json = await res.json();

    console.log("🔥 API RESPONSE:", json);

    return json?.items || [];
  } catch (e) {
    console.log("API ERROR:", e);
    return [];
  }
}

/* ------------ PAGE ------------ */
export default async function Page({ params, searchParams }: any) {

  const stationCode = extractStationCode(params.slug) || "";
  const restroCode = extractRestroCode(params.restroSlug) || "";
  const outletName = humanizeFromSlug(params.restroSlug);

  const stationName =
    params.slug?.split("-")?.slice(1)?.join(" ") || stationCode;

  /* ================= FIX ARRIVAL ================= */

  let arrivalTime = "12:00:00";

  const rawArrival =
    searchParams?.arrival ||
    searchParams?.arrivalTime;

  console.log("🔥 RAW ARRIVAL:", rawArrival);

  if (rawArrival) {
    const clean = rawArrival.slice(0, 5); // 11:50
    arrivalTime = clean + ":00";          // 11:50:00
  }

  console.log("🔥 FINAL ARRIVAL:", arrivalTime);

  /* ================= FETCH ================= */

  const rawItems = await fetchOnMenu(restroCode, arrivalTime);

  /* ================= NORMALIZE ================= */

  const items = (rawItems || []).map((it: any) => ({
    id: Number(it?.id),

    item_name: it?.item_name || "",
    base_price: Number(it?.base_price || 0),

    item_category: it?.item_category || "",

    item_description:
      it?.item_description ||
      it?.description ||
      "",

    start_time:
      it?.start_time ||
      it?.item_start_time ||
      null,

    end_time:
      it?.end_time ||
      it?.item_end_time ||
      null,

    status: String(it?.status || "ON").toUpperCase(),
  }));

  console.log("🔥 FINAL ITEMS:", items.length);

  const header = {
    stationCode,
    restroCode: String(restroCode),
    outletName,
    stationName,
  };

  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
      <RestroMenuClient header={header} items={items} />
    </main>
  );
}
