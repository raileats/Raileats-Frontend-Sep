"use client";
import React, { useEffect, useState } from "react";

type Passenger = {
  serial:number|null;
  bookingStatus:string|null;
  bookingDetails:string|null;
  currentStatus:string|null;
  currentDetails:string|null;
  currentBerthNo:number|null;
  currentCoachId:string|null;
};

export default function PnrView({ pnr }: { pnr: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    if (!pnr) return;
    setLoading(true);
    fetch(`/api/pnr/${encodeURIComponent(pnr)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j?.ok) throw new Error(j?.error || "Failed");
        setData(j);
      })
      .catch((e) => setError(String(e.message || e)))
      .finally(() => setLoading(false));
  }, [pnr]);

  if (loading) return <div className="p-4">Loading…</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!data) return <div className="p-4">No data</div>;

  const info = data;
  return (
    <div className="max-w-3xl mx-auto p-4 bg-white rounded shadow">
      <div className="mb-3">
        <div className="text-sm text-gray-500">PNR</div>
        <div className="text-xl font-semibold">{info.pnr} — {info.trainNo} {info.trainName}</div>
        <div className="text-sm text-gray-600">{info.dateOfJourney} • Boarding: {info.boardingPoint} • {info.source} → {info.destination}</div>
      </div>

      <div className="mb-3">
        <div className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Chart: {info.chartStatus}</div>
        <div className="inline-block ml-2 px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">Passengers: {info.passengersCount}</div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left text-sm text-gray-600">
            <th className="py-2">#</th>
            <th>Booking</th>
            <th>Current</th>
            <th>Coach</th>
            <th>Berth</th>
          </tr>
        </thead>
        <tbody>
          {info.passengers.map((p:Passenger, i:number) => (
            <tr key={i} className="border-t">
              <td className="py-2 text-sm">{p.serial}</td>
              <td className="text-sm">{p.bookingStatus} {p.bookingDetails}</td>
              <td className="text-sm">{p.currentStatus} {p.currentDetails}</td>
              <td className="text-sm">{p.currentCoachId || "-"}</td>
              <td className="text-sm">{p.currentBerthNo ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {info.route && (
        <div className="mt-4">
          <h4 className="font-semibold">Route (partial)</h4>
          <pre className="text-xs bg-gray-50 p-2 rounded">{JSON.stringify(info.route, null, 2)}</pre>
        </div>
      )}

      {info.live && (
        <div className="mt-4">
          <h4 className="font-semibold">Live Status</h4>
          <pre className="text-xs bg-gray-50 p-2 rounded">{JSON.stringify(info.live, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
