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
  item_category?: string | null; // Veg | Jain | Non-Veg
  item_cuisine?: string | null;
  menu_type?: string | null;
  start_time?: string | null; // "HH:MM[:SS]"
  end_time?: string | null;   // "HH:MM[:SS]"
  base_price?: number | null;
  gst_percent?: number | null;
  selling_price?: number | null;
  status?: "ON" | "OFF" | "DELETED" | null;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_BASE =
  process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

/** Make a human title from slug.
 * Works for both:
 *  - "1004-mizaz-e-bhopal"
 *  - "mizaz-e-bhopal-1004"
 * and decodes %20, etc.
 */
function humanizeFromSlug(restroSlug: string) {
  const decoded = decodeURIComponent(String(restroSlug || ""));
  const cleaned = decoded
    .replace(/^\d+-/, "")   // drop leading code if present
    .replace(/-\d+$/, "")   // drop trailing code if present
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

  const title = `${outletName} Menu at ${stationCode} | RailEats`;
  const description = `See ${outletName} (${stationCode}) live menu — Veg/Non-Veg, prices, timings. Order fresh food in train with RailEats.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/Stations/${params.slug}/${params.restroSlug}`,
    },
    openGraph: {
      title,
      description,
      url: `/Stations/${params.slug}/${params.restroSlug}`,
      type: "website",
    },
  };
}

/* ------------ server fetchers ------------ */
async function fetchOnMenu(restroCode: string | number): Promise<MenuItem[]> {
  const url = `${ADMIN_BASE.replace(/\/$/, "")}/api/restros/${encodeURIComponent(
    String(restroCode)
  )}/menu?status=ON`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];

  const j = await res.json().catch(() => ({} as any));
  const rows: MenuItem[] = (j?.rows ?? j?.data ?? (Array.isArray(j) ? j : [])) as any[];
  return rows ?? [];
}

/* ------------ page ------------ */
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

  // If/when you add offers in Admin, pass them here; client hides when null.
  const offer: { text: string } | null = null;

  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
      <RestroMenuClient header={header} items={items} offer={offer} />
    </main>
  );
}
