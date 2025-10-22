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
  MinimumOrdermValue?: number | null;
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
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-md shadow p-4">
          <h2 className="text-lg font-semibold">Station information unavailable</h2>
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
    <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
      {/* Hero / Station header */}
      <div className="mb-6">
        <div
          className="w-full rounded-md bg-gray-100 mb-4 flex items-center justify-center overflow-hidden"
          style={{ height: 180 }}
        >
          {station?.image_url ? (
            <img
              src={station.image_url}
              alt={station.StationName ?? code}
              loading="lazy"
              width={1200}
              height={180}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div className="text-gray-400 text-sm">Station banner</div>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
          {code} — {station?.StationName ?? "Unknown Station"}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {(station?.State ? station.State + " • " : "") + (station?.District ?? "")}
        </p>
      </div>

      {/* Restaurants block */}
      <section className="mb-8">
        <div className="bg-white rounded-md shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-3">Restaurants at {station?.StationName ?? code}.</h2>

          {restaurants.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded text-sm text-gray-700">No active restaurants found for this station.</div>
          ) : (
            <div className="space-y-4">
              {restaurants.map((r) => (
                <article
                  key={String(r.RestroCode)}
                  className="flex flex-col md:flex-row items-stretch gap-3 p-3 sm:p-4 border rounded"
                  style={{ minHeight: 96 }}
                >
                  {/* Image */}
                  <div className="flex-shrink-0 w-full md:w-36 lg:w-44 h-24 md:h-24 bg-gray-100 rounded overflow-hidden">
                    {r.RestroDisplayPhoto ? (
                      <img
                        src={r.RestroDisplayPhoto}
                        alt={r.RestroName ?? "Restaurant image"}
                        loading="lazy"
                        width={440}
                        height={240}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg sm:text-xl font-semibold leading-tight truncate">
                        {r.RestroName}
                      </h3>

                      <div className="mt-1 text-sm text-gray-600 flex flex-wrap items-center gap-2">
                        <span>Rating: {r.RestroRating ?? "—"}</span>
                        <span className="mx-1">•</span>
                        <span>{r.isPureVeg ? "Veg" : "Non-Veg"}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="px-2 py-1 rounded bg-gray-100 text-sm text-gray-700">
                        Open: {r.OpenTime ?? "—"} — {r.ClosedTime ?? "—"}
                      </div>

                      <div className="ml-auto text-right">
                        <div className="text-xs text-gray-500">Min order</div>
                        <div className="font-medium text-base">₹{r.MinimumOrdermValue ?? "—"}</div>
                      </div>

                      {/* Order button: mobile full width, desktop normal */}
                      <div className="w-full md:w-auto md:ml-4">
                        <a
                          href={`/menu?restro=${encodeURIComponent(String(r.RestroCode))}`}
                          className="inline-block bg-green-600 text-white px-4 py-2 rounded text-sm w-full md:w-auto text-center"
                          aria-label={`Order now from ${r.RestroName}`}
                        >
                          Order Now
                        </a>
                      </div>
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
