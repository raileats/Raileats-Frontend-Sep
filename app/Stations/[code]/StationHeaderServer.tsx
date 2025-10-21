// components/StationHeaderServer.tsx
import React from "react";

export default function StationHeaderServer({ station }: { station?: any }) {
  const name = station?.StationName ?? station?.StationName ?? station?.StationCode ?? "Station";
  const code = station?.StationCode ?? "";
  const state = station?.State ?? "";
  const district = station?.District ?? "";

  return (
    <header className="mb-6">
      <div className="bg-gray-50 rounded overflow-hidden">
        {station?.image_url ? (
          <div className="w-full h-56 bg-gray-100 flex items-center justify-center">
            <img src={station.image_url} alt={name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-56 bg-gray-100 flex items-center justify-center text-gray-500">No image</div>
        )}
      </div>

      <div className="mt-4">
        <h1 className="text-2xl font-bold">
          {code} — {name}
        </h1>
        <div className="text-sm text-gray-600 mt-1">
          {state} {state && district ? "• " : ""} {district}
        </div>
      </div>
    </header>
  );
}
