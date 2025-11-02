// app/Stations/[slug]/[restroSlug]/page.tsx
import React from "react";
import { extractStationCode } from "../../../lib/stationSlug";
import { extractRestroCode } from "../../../lib/restroSlug";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Page({
  params,
}: {
  params: { slug: string; restroSlug: string };
}) {
  const stationCode = extractStationCode(params.slug) || "";
  const restroCode = extractRestroCode(params.restroSlug) || "";

  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
      <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
        Menu — Outlet {restroCode}
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Station: {stationCode || params.slug}
      </p>

      <div className="mt-6 p-4 rounded border bg-white">
        <p className="text-sm text-gray-700">
          Page connected. Next step will load live menu (status <code>ON</code>),
          add Veg-only toggle, group by Menu Type, and cart UI.
        </p>
      </div>
    </main>
  );
}
