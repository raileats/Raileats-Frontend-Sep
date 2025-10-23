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

function formatTimeShort(t?: string | null) {
  if (!t) return "—";
  const parts = String(t).split(":");
  if (parts.length < 2) return t;
  let hh = parseInt(parts[0], 10);
  const mm = parts[1];
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12;
  if (hh === 0) hh = 12;
  return `${hh}:${mm}${ampm}`;
}
function formatTimeRange(open?: string | null, close?: string | null) {
  if (!open && !close) return "—";
  return `${formatTimeShort(open)} to ${formatTimeShort(close)}`;
}

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

  // Build station title line
  const stationLine =
    station?.StationName && station?.State
      ? `${code} — ${station.StationName} • ${station.State}`
      : station?.StationName
      ? `${code} — ${station.StationName}`
      : code;

  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
      {/* Hero / Station header: left square image, right text (stacked on mobile) */}
      <div className="mb-6">
        <div className="w-full rounded-md bg-gray-100 mb-4 flex items-start justify-center overflow-visible">
          <div className="w-full max-w-5xl mx-auto px-2">
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 items-start">
              {/* LEFT: square station image */}
              <div className="flex-shrink-0">
                <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-lg overflow-hidden bg-gray-200">
                  {station?.image_url ? (
                    <img
                      src={station.image_url}
                      alt={station.StationName ?? code}
                      loading="lazy"
                      className="w-full h-full object-cover object-center block"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
                  )}
                </div>
              </div>

              {/* RIGHT: title + meta */}
              <div className="flex flex-col justify-center">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">
                  {stationLine}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {(station?.District ? station.District + " • " : "") + (station?.State ?? "")}
                </p>
              </div>
            </div>
          </div>
        </div>
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
                >
                  {/* Square thumbnail (responsive sizes) */}
                  <div className="flex-shrink-0 w-full md:w-28 lg:w-36">
                    <div className="w-full h-0" style={{ paddingTop: "100%", position: "relative" }}>
                      {r.RestroDisplayPhoto ? (
                        <img
                          src={r.RestroDisplayPhoto}
                          alt={r.RestroName ?? "Restaurant image"}
                          loading="lazy"
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                            borderRadius: 8,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#9CA3AF",
                            borderRadius: 8,
                            background: "#F3F4F6",
                          }}
                        >
                          No image
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h3 className="text-lg sm:text-xl font-semibold leading-tight truncate">{r.RestroName}</h3>

                          <div className="mt-1 text-sm text-gray-600 flex items-center gap-3">
                            <span>Rating: {r.RestroRating ?? "—"}</span>
                            <span className="mx-1">•</span>

                            <span className="flex items-center gap-1">
                              {r.isPureVeg ? (
                                <span aria-hidden className="w-3 h-3 rounded bg-green-600 inline-block" title="Veg" />
                              ) : (
                                <>
                                  <span className="w-3 h-3 rounded bg-red-600 inline-block" title="Non-Veg" />
                                  <span className="w-3 h-3 rounded bg-green-600 inline-block" title="Also serves Veg" />
                                </>
                              )}
                            </span>
                          </div>

                          <div className="mt-2 text-sm text-gray-700"><strong>Multi Cuisines</strong></div>
                        </div>

                        <div className="ml-2 flex flex-col items-end gap-3">
                          <div className="text-xs text-gray-500">Min order</div>
                          <div className="font-medium text-base">₹{r.MinimumOrdermValue ?? "—"}</div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="inline-block px-2 py-1 rounded bg-gray-100 text-sm text-gray-700">
                          {formatTimeRange(r.OpenTime, r.ClosedTime)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center">
                      <div className="ml-auto w-full md:w-auto">
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
