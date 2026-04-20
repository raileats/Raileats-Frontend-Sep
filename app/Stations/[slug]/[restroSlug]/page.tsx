import React from "react";
import { extractStationCode } from "../../../lib/stationSlug";
import { extractRestroCode } from "../../../lib/restroSlug";
import RestroMenuClient from "./RestroMenuClient";

/* ------------ TYPES ------------ */
type MenuItem = {
  id: number;
  item_name: string;
  base_price?: number | null;
  item_category?: string | null;

  // ✅ LIVE API fields
  item_description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
};

/* ------------ CONFIG ------------ */
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

/* ------------ FETCH (🔥 LIVE API) ------------ */
async function fetchOnMenu(
  restroCode: string | number,
  arrivalTime: string
): Promise<MenuItem[]> {
  try {
    const res = await fetch(
      `https://raileats.in/api/restro-menu?restro=${restroCode}&arrivalTime=${arrivalTime}`,
      { cache: "no-store" }
    );

    const json = await res.json();
    return json?.items || [];
  } catch {
    return [];
  }
}

/* ------------ PAGE ------------ */
export default async function Page({
  params,
  searchParams,
}: any) {
  const stationCode = extractStationCode(params.slug) || "";
  const restroCode = extractRestroCode(params.restroSlug) || "";
  const outletName = humanizeFromSlug(params.restroSlug);

  const stationName =
    params.slug?.split("-")?.slice(1)?.join(" ") || stationCode;

  // ✅ arrival time from URL
  const arrivalTime =
    searchParams?.arrival?.split(":").slice(0, 2).join(":") + ":00" ||
    "12:00:00";

  const rawItems = await fetchOnMenu(restroCode, arrivalTime);

  // ✅ FINAL NORMALIZATION (LIVE FORMAT)
  const items = rawItems.map((it: any) => ({
    id: Number(it.id),

    item_name: it.item_name || "",
    base_price: Number(it.base_price || 0),

    // ✅ veg/non-veg
    item_category: it.item_category || "",

    // ✅ 🔥 DESCRIPTION FIX
    item_description: it.item_description || "",

    // ✅ 🔥 TIME FIX
    start_time: it.start_time || null,
    end_time: it.end_time || null,

    status: "ON",
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
