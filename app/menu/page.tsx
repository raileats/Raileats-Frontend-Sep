"use client";

import { useSearchParams } from "next/navigation";

export default function MenuPage() {
  const searchParams = useSearchParams();

  const restro = searchParams.get("restro");
  const arrival = searchParams.get("arrival");
  const stationName = searchParams.get("stationName");

  console.log("MENU PARAMS:", {
    restro,
    arrival,
    stationName,
  });

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Menu Page</h1>

      <div className="mt-4 text-sm">
        <div><b>Restro:</b> {restro}</div>
        <div><b>Arrival:</b> {arrival}</div>
        <div><b>Station:</b> {stationName}</div>
      </div>

      <div className="mt-6 text-green-600">
        ✅ Menu page working (Next step: items load)
      </div>
    </div>
  );
}
