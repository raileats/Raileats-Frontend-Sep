import React from "react";
import { extractStationCode } from "../../../lib/stationSlug";
import { extractRestroCode } from "../../../lib/restroSlug";
import RestroMenuClient from "./RestroMenuClient";

export const dynamic = "force-dynamic";
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

    console.log("API RESPONSE:", json);

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

  /* 🔥 ARRIVAL TIME FIX */
  let arrivalTime = "12:00:00";

  if (searchParams?.arrival) {
    const t = searchParams.arrival.slice(0, 5); // 11:50
    arrivalTime = t + ":00"; // 11:50:00
  }

  /* 🔥 FETCH DATA */
  const rawItems = await fetchOnMenu(restroCode, arrivalTime);

  /* 🔥🔥 FINAL NORMALIZATION (MAIN FIX) */
  const items = rawItems.map((it: any) => ({
    id: Number(it.id),

    item_name: it.item_name || "",
    base_price: Number(it.base_price || 0),

    item_category: it.item_category || "",

    // description fix
    item_description:
      it.item_description ||
      it.description ||
      "",

    // timing fix
    start_time:
      it.start_time ||
      it.item_start_time ||
      null,

    end_time:
      it.end_time ||
      it.item_end_time ||
      null,

    // 🔥 STATUS FIX (MAIN BUG)
    status: (it.status || "ON").toUpperCase(),
  }));

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
