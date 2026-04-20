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

/* ------------ FETCH (LIVE API) ------------ */
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
  } catch {
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

  /* ✅ SAFE ARRIVAL TIME */
  let arrivalTime = "12:00:00";

  if (searchParams?.arrival) {
    const parts = searchParams.arrival.split(":");
    arrivalTime = `${parts[0]}:${parts[1] || "00"}:00`;
  }

  /* ✅ FETCH DATA */
  const items = await fetchOnMenu(restroCode, arrivalTime);

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
