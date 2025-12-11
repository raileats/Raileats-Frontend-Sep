// app/pnr/[pnr]/page.tsx (client-side rendering version)
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function PnrPage() {
  const params: any = useParams();
  const pnr = params?.pnr;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pnr) return;
    setLoading(true);
    fetch(`/api/pnr/${encodeURIComponent(pnr)}`)
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch((e) => setData({ ok: false, error: String(e) }))
      .finally(() => setLoading(false));
  }, [pnr]);

  if (loading) return <div>Loading…</div>;
  if (!data) return <div>No data</div>;
  if (!data.ok) return <div>Error: {String(data.error)}</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-xl font-semibold">PNR {pnr}</h2>
      <div className="mt-3">
        <strong>Train:</strong> {data.trainNumber} {data.trainName}
      </div>
      <div className="mt-2">
        <strong>Journey:</strong> {data.journeyDate}
      </div>

      <h3 className="mt-4 font-medium">Passengers</h3>
      <table className="w-full text-sm mt-2">
        <thead><tr><th>#</th><th>Booking</th><th>Current</th></tr></thead>
        <tbody>
          {(data.passengers || []).map((p: any, i: number) => (
            <tr key={i}>
              <td>{i+1}</td>
              <td>{p.BookingStatus ?? p.Booking ?? p.Booked}</td>
              <td>{p.CurrentStatus ?? p.Current ?? p.Status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="mt-4 font-medium">Route (sample)</h3>
      <div className="mt-2">
        {data.route && data.route.stations ? (
          <ol>
            {data.route.stations.map((s: any, idx: number) => (
              <li key={idx}>{s.StationName ?? s.stationName} ({s.StationCode ?? s.stationCode}) — {s.Arrives ?? s.arrivalTime ?? ""}</li>
            ))}
          </ol>
        ) : <div>No route data</div>}
      </div>

      <h3 className="mt-4 font-medium">Live Status</h3>
      <div className="mt-2">
        {data.liveStatus ? (
          <div>
            Current station: {data.liveStatus.CurrentStation?.StationName ?? data.liveStatus.current_station?.StationName ?? "—"}
          </div>
        ) : <div>No live data</div>}
      </div>
    </div>
  );
}
