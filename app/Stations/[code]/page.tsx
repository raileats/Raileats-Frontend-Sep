// app/Stations/[code]/page.tsx
import React from "react";

type Restro = {
  RestroCode: string | number;
  RestroName?: string;
  RestroRating?: number | null;
  isPureVeg?: boolean;
  RestroDisplayPhoto?: string | null;
  OpenTime?: string | null;
  ClosedTime?: string | null;
  MinimumOrdermValue?: number | null; // note: CSV has this name
};

type StationResp = {
  station: {
    StationCode: string;
    StationName: string | null;
    State?: string | null;
    District?: string | null;
    image_url?: string | null;
  } | null;
  restaurants: Restro[];
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function fetchStation(code: string): Promise<StationResp> {
  const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.raileats.in";
  const url = `${ADMIN_BASE.replace(/\/$/, "")}/api/stations/${encodeURIComponent(code)}`;

  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Failed to load station: ${resp.status} ${txt}`);
  }
  const json = (await resp.json()) as StationResp;
  return json;
}

export default async function Page({ params }: { params: { code: string } }) {
  const code = (params?.code || "").toUpperCase();

  let stationResp: StationResp | null = null;
  try {
    stationResp = await fetchStation(code);
  } catch (err: any) {
    return (
      <main className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-md shadow p-6">
          <h2 className="text-xl font-semibold">Station information unavailable</h2>
          <p className="mt-2 text-sm text-gray-600">
            We could not load details for station {code}. Please try again in a moment.
          </p>
          <pre className="mt-4 bg-yellow-50 p-3 rounded text-sm text-gray-700">{String(err.message)}</pre>
        </div>
      </main>
    );
  }

  const station = stationResp.station;
  const restaurants = stationResp.restaurants ?? [];

  return (
    <main className="max-w-5xl mx-auto p-8">
      {/* Header / Hero */}
      <div className="mb-8">
        <div style={{ height: 220, background: "#f3f4f6", borderRadius: 6 }} className="mb-4 flex items-center justify-center">
          {station?.image_url ? (
            // simple <img>, don't use next/image for simplicity here
            <img src={station.image_url} alt={station.StationName ?? code} style={{ maxHeight: 200 }} />
          ) : (
            <div className="text-gray-400">Station banner</div>
          )}
        </div>
        <h1 className="text-3xl font-bold">{code} — {station?.StationName ?? "Unknown Station"}</h1>
        <p className="text-sm text-gray-600 mt-1">{(station?.State ? station.State + " • " : "") + (station?.District ?? "")}</p>
      </div>

      {/* Restaurants block */}
      <section>
        <div className="bg-white rounded-md shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Restaurants at {station?.StationName ?? code}.</h2>

          {restaurants.length === 0 ? (
            <div className="p-6 bg-gray-50 rounded text-sm text-gray-700">
              No active restaurants found for this station.
            </div>
          ) : (
            <div className="space-y-4">
              {restaurants.map((r) => (
                <article key={String(r.RestroCode)} className="flex items-stretch gap-4 p-4 border rounded">
                  <div style={{ width: 140, minWidth: 140, height: 90 }} className="bg-gray-100 rounded overflow-hidden">
                    {r.RestroDisplayPhoto ? (
                      <img src={r.RestroDisplayPhoto} alt={r.RestroName ?? "Restaurant image"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold">{r.RestroName}</h3>
                        <div className="text-sm text-gray-600 mt-1">
                          Rating: {r.RestroRating ?? "—"} • {r.isPureVeg ? "Veg" : "Non-Veg"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Min order</div>
                        <div className="font-medium">₹{r.MinimumOrdermValue ?? "—"}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="px-2 py-1 rounded bg-gray-100 text-sm">
                        Open: {r.OpenTime ?? "—"} — {r.ClosedTime ?? "—"}
                      </div>

                      {/* Order Now button (visible always; actual order flow will validate open time) */}
                      <a
                        href={`/menu?restro=${encodeURIComponent(String(r.RestroCode))}`}
                        className="ml-auto inline-block bg-green-600 text-white px-4 py-2 rounded text-sm"
                        aria-label={`Order now from ${r.RestroName}`}
                      >
                        Order Now
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
