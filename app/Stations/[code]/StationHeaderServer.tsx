// app/Stations/[code]/StationHeaderServer.tsx
import React from "react";

export default function StationHeaderServer({ station }: { station: any }) {
  const img = station?.image_url ?? null;
  return (
    <header className="max-w-4xl mx-auto mb-6">
      <div className="w-full rounded overflow-hidden bg-gray-100 h-56 flex items-center justify-center">
        {img ? (
          // server-side render img (plain <img>)
          <img src={img} alt={station?.StationName || "Station image"} className="w-full h-full object-cover" />
        ) : (
          <div className="text-gray-400">No image</div>
        )}
      </div>

      <h1 className="text-2xl font-bold mt-4">{station?.StationCode} — {station?.StationName}</h1>
      <div className="text-sm text-gray-600">{station?.State} • {station?.District}</div>
    </header>
  );
}
