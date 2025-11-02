// app/Stations/[stationSlug]/[restroSlug]/page.tsx
import React from "react";
import { extractStationCode } from "../../../lib/stationSlug";
import { extractRestroCode } from "../../../lib/restroSlug";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Page({
  params,
}: {
  params: { stationSlug: string; restroSlug: string };
}) {
  const stationCode = extractStationCode(params.stationSlug) || "";
  const restroCode = extractRestroCode(params.restroSlug) || "";

  // TODO(next step): fetch menu items (status=ON) for restroCode and render
  // with Veg-only toggle, sections by menu_type, cart etc.
  // For now, simple shell so the page loads.
  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
      <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
        Menu — Outlet {restroCode}
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Station: {stationCode || params.stationSlug}
      </p>

      <div className="mt-6 p-4 rounded border bg-white">
        <p className="text-sm text-gray-700">
          Page connected. Next step will load live menu (status <code>ON</code>), add Veg-only
          toggle, and the cart UI.
        </p>
      </div>
    </main>
  );
}
