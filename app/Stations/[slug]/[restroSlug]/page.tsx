import React from "react";
import type { Metadata } from "next";
import { extractStationCode } from "../../../lib/stationSlug";
import { extractRestroCode } from "../../../lib/restroSlug";
import RestroMenuClient from "./RestroMenuClient";

/* ------------ types ------------ */
type MenuItem = {
  id: number;
  restro_code: string | number;
  item_name: string;
  base_price?: number | null;
  item_category?: string | null;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_BASE =
  process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

/* ------------ helpers ------------ */
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

  const stationName =
    params.slug?.split("-")?.slice(1)?.join(" ") || stationCode;

  const rawItems = await fetchOnMenu(restroCode);

  // ✅ 🔥 FIX: normalize items
  const items = rawItems.map((it) => ({
    id: it.id,
    item_name: it.item_name,
    base_price: Number(it.base_price || 0), // ✅ always number
    is_veg: it.item_category?.toLowerCase() !== "non-veg",
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
