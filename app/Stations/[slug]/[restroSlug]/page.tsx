// app/Stations/[slug]/[restroSlug]/page.tsx
import React from "react";
import type { Metadata } from "next";
import { extractStationCode } from "../../../lib/stationSlug";
import { extractRestroCode } from "../../../lib/restroSlug";
import RestroMenuClient from "./RestroMenuClient";

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

const ADMIN_BASE =
  process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";

const fmtHM = (s?: string | null) => (s ? s.slice(0, 5) : "");

function humanizeFromSlug(restroSlug: string) {
  // turns "mizaz-e-bhopal-restraurant-1004" -> "Mizaz E Bhopal Restraurant"
  const withoutCode = String(restroSlug).replace(/-?\d+$/,"").replace(/-$/,"");
  return withoutCode
    .split("-")
    .filter(Boolean)
    .map(w => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

/* ---------------- SEO ---------------- */
export async function generateMetadata({
  params,
}: {
  params: { slug: string; restroSlug: string };
}): Promise<Metadata> {
  const stationCode = extractStationCode(params.slug) || "";
  const outletName = humanizeFromSlug(params.restroSlug);
  return {
    title: `${outletName} Menu at ${stationCode} | RailEats`,
    description: `See ${outletName} (${stationCode}) live menu — Veg/Non-Veg, prices, timings. Order fresh food in train with RailEats.`,
    alternates: {
      canonical: `/Stations/${params.slug}/${params.restroSlug}`,
    },
    openGraph: {
      title: `${outletName} Menu at ${stationCode} | RailEats`,
      description: `Live menu and ordering for ${outletName} at ${stationCode}.`,
      url: `/Stations/${params.slug}/${params.restroSlug}`,
      type: "website",
    },
  };
}

/* --------------- data fetchers (server) --------------- */
async function fetchOnMenu(restroCode: string | number): Promise<MenuItem[]> {
  const url = `${ADMIN_BASE.replace(/\/$/,"")}/api/restros/${encodeURIComponent(
    String(restroCode)
  )}/menu?status=ON`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const j = await res.json().catch(() => ({}));
  // support both {rows:[...]} and raw array
  const rows: MenuItem[] = (j?.rows ?? j?.data ?? (Array.isArray(j) ? j : [])) as any[];
  return rows || [];
}

export default async function Page({
  params,
}: {
  params: { slug: string; restroSlug: string };
}) {
  const stationCode = extractStationCode(params.slug) || "";
  const restroCode = extractRestroCode(params.restroSlug) || "";
  const outletName = humanizeFromSlug(params.restroSlug);

  const items = await fetchOnMenu(restroCode);

  // shape a small station/restro header object for the client
  const header = {
    stationCode,
    restroCode,
    outletName,
  };

  // Optional: detect an offer/discount from Admin (if you add an API later).
  // For now, pass null and the client will hide the box.
  const offer: { text: string } | null = null;

  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
      <RestroMenuClient header={header} items={items} offer={offer} />
    </main>
  );
}
