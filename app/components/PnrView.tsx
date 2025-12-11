// components/PnrView.jsx
import React from "react";

export default function PnrView({ data }) {
  if (!data || !data.ok) {
    return <div>PNR data not available</div>;
  }

  const {
    pnr,
    trainName,
    trainNo,
    dateOfJourney,
    source,
    destination,
    boardingPoint,
    passengers = [],
    route,
    live,
  } = data;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
      <h2>PNR {pnr}</h2>

      <div style={{ marginBottom: 16 }}>
        <strong>Train:</strong> {trainName || `#${trainNo}` || "Unknown"}
      </div>

      <div style={{ marginBottom: 16 }}>
        <strong>Journey:</strong>{" "}
        {source && destination ? `${source} → ${destination}` : "Not available"}
        {dateOfJourney ? ` • ${dateOfJourney}` : ""}
      </div>

      <div style={{ marginBottom: 16 }}>
        <strong>Boarding Point:</strong> {boardingPoint || "N/A"}
      </div>

      <div style={{ marginTop: 16 }}>
        <h4>Passengers</h4>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>#</th>
              <th>Booking</th>
              <th>Current</th>
            </tr>
          </thead>
          <tbody>
            {passengers.length === 0 ? (
              <tr><td colSpan={3}>No passenger data</td></tr>
            ) : passengers.map((p) => (
              <tr key={p.serial}>
                <td>{p.serial}</td>
                <td>{p.bookingDetails || p.bookingStatus || "-"}</td>
                <td>{p.currentDetails || p.currentStatus || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 24 }}>
        <h4>Route (sample)</h4>
        {route && !route.error ? (
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(route, null, 2)}</pre>
        ) : (
          <div>No route data</div>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <h4>Live Status</h4>
        {live && !live.error ? (
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(live, null, 2)}</pre>
        ) : (
          <div>No live data</div>
        )}
      </div>
    </div>
  );
}
