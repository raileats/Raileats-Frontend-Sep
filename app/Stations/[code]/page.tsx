// app/Stations/[code]/page.tsx
import StationHeaderServer from "./StationHeaderServer";
import StationClientWidgets from "./StationClientWidgets";

type Props = { params: { code: string } };

export default async function StationPage({ params }: Props) {
  const code = params.code;
  const BASE = process.env.NEXT_PUBLIC_APP_URL || ""; // can be empty -> relative fetch
  const url = `${BASE}/api/stations/${encodeURIComponent(code)}`;

  let station: any = null;
  let restaurants: any[] = [];
  let fetchError: string | null = null;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });

    if (!res.ok) {
      // try to read JSON error or fallback to text
      try {
        const errJson = await res.json();
        fetchError = errJson?.error ? String(errJson.error) : `HTTP ${res.status}`;
      } catch (e) {
        const text = await res.text().catch(() => "");
        fetchError = text || `HTTP ${res.status}`;
      }
    } else {
      // success: parse body safely
      try {
        const body = await res.json();
        station = body?.station ?? null;
        restaurants = Array.isArray(body?.restaurants) ? body.restaurants : [];
      } catch (e) {
        fetchError = "Failed to parse station data";
      }
    }
  } catch (err: any) {
    // network / runtime error
    fetchError = err?.message ? String(err.message) : String(err);
  }

  // If there was an error, show friendly message + (optional) debug info
  if (!station) {
    return (
      <main className="p-6">
        <section className="max-w-4xl mx-auto">
          <div className="bg-white border rounded p-6">
            <h1 className="text-2xl font-semibold mb-2">Station information unavailable</h1>
            <p className="text-sm text-gray-700 mb-4">
              We could not load details for station <strong>{code}</strong>.
              Please try again in a moment.
            </p>

            {fetchError && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 text-sm text-yellow-900 rounded">
                <div className="font-medium mb-1">Debug info</div>
                <div className="whitespace-pre-wrap break-words">{fetchError}</div>
              </div>
            )}

            <div className="mt-4">
              <a href="/" className="inline-block px-4 py-2 bg-black text-white rounded">Back to Home</a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // Normal render when station data exists
  return (
    <main className="p-6">
      <section className="max-w-4xl mx-auto">
        <StationHeaderServer station={station} />
        <StationClientWidgets />

        <h2 className="text-xl font-semibold mb-4">Restaurants</h2>
        {(!restaurants || restaurants.length === 0) && (
          <div className="mb-4">No active restaurants found for this station.</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {restaurants?.map((r: any) => (
            <article key={r.code} className="border rounded p-3 flex gap-3">
              <div className="w-28 h-20 flex-shrink-0">
                {r.image_url ? (
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
                <div className="text-sm text-gray-600">
                  {r.type} • {Array.isArray(r.cuisines) ? r.cuisines.join(", ") : r.cuisines}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
