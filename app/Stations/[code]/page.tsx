// app/Stations/[code]/page.tsx
import StationHeaderServer from "@/components/StationHeaderServer";
type Props = { params: { code: string } };

export default async function StationPage({ params }: Props) {
  const code = (params.code || "").toString().toUpperCase();
  const BASE = process.env.NEXT_PUBLIC_APP_URL || ""; // can be empty for relative fetch
  // use server-side fetch to our API route
  const res = await fetch(`${BASE}/api/stations/${encodeURIComponent(code)}`, { next: { revalidate: 60 } });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return (
      <main className="p-6">
        <section className="max-w-4xl mx-auto">
          <div className="border rounded p-6 bg-white">
            <h2 className="text-xl font-semibold mb-2">Station information unavailable</h2>
            <p>We could not load details for station {code}. Please try again in a moment.</p>
            <pre className="mt-4 p-2 bg-yellow-50 text-sm">{txt}</pre>
          </div>
        </section>
      </main>
    );
  }

  const json = await res.json();
  const station = json.station ?? null;
  const restaurants = json.restaurants ?? [];

  return (
    <main className="p-6">
      <section className="max-w-4xl mx-auto">
        {station ? <StationHeaderServer station={station} /> : null}

        <div className="mt-6 bg-white p-4 rounded shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Restaurants at {station?.StationName ?? code}</h2>

          {restaurants.length === 0 ? (
            <div className="text-gray-600">No active restaurants found for this station.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {restaurants.map((r: any) => (
                <article key={r.code} className="border rounded p-3 flex gap-3 bg-white">
                  <div className="w-28 h-20 flex-shrink-0">
                    {r.image_url ? (
                      // next/image cannot be used on remote dynamic urls server-side easily without config,
                      // so use ordinary img
                      <img src={r.image_url} alt={r.name} className="w-full h-full object-cover rounded" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center text-xs">No photo</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-sm">{r.rating ? `${r.rating}★` : "—"}</div>
                    </div>

                    <div className="text-sm text-gray-600 mt-1">
                      {r.type ? `${r.type} • ` : ""}
                      {Array.isArray(r.cuisines) && r.cuisines.length ? r.cuisines.slice(0, 3).join(", ") : ""}
                    </div>

                    <div className="mt-2 text-sm text-gray-800">
                      {r.min_order ? <>Min. Order: ₹{r.min_order}</> : null}
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
