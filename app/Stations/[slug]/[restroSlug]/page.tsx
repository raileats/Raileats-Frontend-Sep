import React from "react";
import type { Metadata } from "next";
import { extractStationCode } from "../../../lib/stationSlug";
import { extractRestroCode } from "../../../lib/restroSlug";
import RestroMenuClient from "./RestroMenuClient";

/* ------------ types ------------ */
type MenuItem = {
  id: number;
  restro_code: string | number;
  item_code?: string | null;
  item_name: string;
  item_description?: string | null;
  item_category?: string | null;
  item_cuisine?: string | null;
  menu_type?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  base_price?: number | null;
  gst_percent?: number | null;
  selling_price?: number | null;
  status?: string | null;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_BASE =
  process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

/* ------------ helpers ------------ */
function humanizeFromSlug(restroSlug: string) {
  const decoded = decodeURIComponent(String(restroSlug || ""));
  const cleaned = decoded
    .replace(/^\d+-/, "")
    .replace(/-\d+$/, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/* ------------ SEO ------------ */
export async function generateMetadata({
  params,
}: {
  params: { slug: string; restroSlug: string };
}): Promise<Metadata> {
  const stationCode = extractStationCode(params.slug) || "";
  const outletName = humanizeFromSlug(params.restroSlug);

  return {
    title: `${outletName} Menu at ${stationCode} | RailEats`,
    description: `Order food from ${outletName} at ${stationCode}`,
  };
}

/* ------------ FETCH ------------ */
async function fetchOnMenu(restroCode: string | number): Promise<MenuItem[]> {
  const url = `${ADMIN_BASE}/api/restros/${restroCode}/menu`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];

    const j = await res.json();
    return j?.rows || j?.data || j || [];
  } catch {
    return [];
  }
}

/* ------------ PAGE ------------ */
export default async function Page({
  params,
}: {
  params: { slug: string; restroSlug: string };
}) {
  const stationCode = extractStationCode(params.slug) || "";
  const restroCode = extractRestroCode(params.restroSlug) || "";
  const outletName = humanizeFromSlug(params.restroSlug);

  const items = await fetchOnMenu(restroCode);

  const header = { stationCode, restroCode, outletName };

  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
      {/* ✅ offer REMOVE kar diya (error fix) */}
      <RestroMenuClient header={header} items={items} />
    </main>
  );
}
