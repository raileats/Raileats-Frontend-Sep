// app/Stations/[code]/page.tsx
import StationHeaderServer from "./StationHeaderServer";
import StationClientWidgets from "./StationClientWidgets";

type Props = { params: { code: string } };

export default async function StationPage({ params }: Props) {
  const code = params.code.toUpperCase();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.raileats.in";
  const apiUrl = new URL(`/api/stations/${encodeURIComponent(code)}`, baseUrl).toString();

  let station: any = null;
  let restaurants: any[] = [];
  let fetchError: string | null = null;

  try {
    const res = await fetch(apiUrl, { next: { revalidate: 60 } });
    if (!res.ok) {
      try { const e = await res.json(); fetchError = e?.error ?? `HTTP ${res.status}`; } catch { fetchError = `HTTP ${res.status}`; }
    } else {
      const body = await res.json();
      station = body?.station ?? null;
      restaurants = Array.isArray(body?.restaurants) ? body.restaurants : [];
    }
  } catch (err: any) { fetchError = err?.message ?? String(err); }

  if (!station) {
    return (
      <main className="p-6">
        <section className="max-w-4xl mx-auto">
          <div className="bg-white border rounded p-6">
            <h1 className="text-2xl font-semibold mb-2">Station information unavailable</h1>
            <p className="text-sm text-gray-700">We could not load details for station <strong>{code}</strong>.</p>
            {fetchError && <div className="mt-4 p-3 bg-yellow-50 border text-sm rounded">{fetchError}</div>}
            <div className="mt-4"><a href="/" className="px-4 py-2 bg-black text-white rounded">Back to Home</a></div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="p-6">
      <section className="max-w-4xl mx-auto">
        <StationHeaderServer station={station} />
        <StationClientWidgets />

        <h2 className="text-xl font-semibold mb-4">Restaurants at {station.StationName}</h2>
        {restaurants.length === 0 && <div>No active restaurants found for this station.</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {restaurants.map((r:any) => (
            <article key={r.code} className="flex gap-4 border rounded p-3">
              <div className="w-36 h-28 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                {r.image_url ? <img src={r.image_url} alt={r.name} className="w-full h-full object-cover" /> :
                  <div className="w-full h-full flex items-center justify-center text-xs">No photo</div>}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-medium">{r.name}</h3>
                  {r.rating && <span className="ml-auto bg-green-600 text-white text-sm px-2 py-1 rounded">{r.rating}★</span>}
                </div>
                <div className="text-sm text-gray-600 mt-1">Station: {station.StationName}</div>
                <div className="text-sm text-gray-600 mt-2">{r.cuisines?.slice(0,3).join(", ")}{r.cuisines?.length>3 ? "..." : ""}</div>
                <div className="mt-2 text-sm">Min. Order: {r.min_order ? `₹${r.min_order}` : "—"}</div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
