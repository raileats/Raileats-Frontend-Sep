"use client";

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
      // ✅ FIX: arrival param सही किया
      `https://raileats.in/api/restro-menu?restro=${restroCode}&arrival=${arrivalTime}`,
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

  /* 🔥 ARRIVAL TIME FIX (SAFE) */
  let arrivalTime = "12:00:00";

  const arrivalParam =
    searchParams?.arrival ||
    searchParams?.arrivalTime || // ✅ fallback support
    "";

  if (arrivalParam) {
    const t = arrivalParam.slice(0, 5); // 11:50
    arrivalTime = t + ":00"; // 11:50:00
  }

  console.log("FINAL ARRIVAL SENT:", arrivalTime);

  /* 🔥 FETCH DATA */
  const rawItems = await fetchOnMenu(restroCode, arrivalTime);

  /* 🔥🔥 FINAL NORMALIZATION */
  const items = rawItems.map((it: any) => ({
    id: Number(it.id),

    item_name: it.item_name || "",
    base_price: Number(it.base_price || 0),

    item_category: it.item_category || "",

    item_description:
      it.item_description ||
      it.description ||
      "",

    start_time:
      it.start_time ||
      it.item_start_time ||
      null,

    end_time:
      it.end_time ||
      it.item_end_time ||
      null,

    // ✅ STATUS SAFE
    status: String(it.status || "ON").toUpperCase(),
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