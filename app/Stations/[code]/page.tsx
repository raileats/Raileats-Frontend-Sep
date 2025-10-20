// app/Stations/[code]/page.tsx
import StationHeaderServer from "./StationHeaderServer";
import StationClientWidgets from "./StationClientWidgets";

type Props = { params: { code: string } };

export default async function StationPage({ params }: Props) {
  const code = params.code;
  const BASE = process.env.NEXT_PUBLIC_APP_URL || "";
  const res = await fetch(`${BASE}/api/stations/${encodeURIComponent(code)}`, { next: { revalidate: 60 } });

  if (!res.ok) {
    return <div className="p-6">Station not found or error</div>;
  }
  const { station, restaurants } = await res.json();

  return (
    <main className="p-6">
      <section className="max-w-4xl mx-auto">
        <StationHeaderServer station={station} />
        <StationClientWidgets />

        <h2 className="text-xl font-semibold mb-4">Restaurants</h2>
        {(!restaurants || restaurants.length === 0) && <div>No active restaurants found for this station.</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {restaurants?.map((r: any) => (
            <article key={r.code} className="border rounded p-3 flex gap-3">
              <div className="w-28 h-20 flex-shrink-0">
                {r.image_url ? <img src={r.image_url} alt={r.name} className="w-full h-full object-cover rounded" /> :
                  <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center text-xs">No photo</div>}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-sm">{r.rating ? `${r.rating}★` : "—"}</div>
                </div>
                <div className="text-sm text-gray-600">{r.type} • {Array.isArray(r.cuisines) ? r.cuisines.join(", ") : r.cuisines}</div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
