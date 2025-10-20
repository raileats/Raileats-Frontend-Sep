// app/Stations/[code]/StationClientWidgets.tsx
"use client";

import StationSearchBox from "@/app/components/StationSearchBox";

export default function StationClientWidgets() {
  return (
    <div className="mb-6">
      <StationSearchBox onSelect={() => { /* no-op here; parent page will handle main navigation via SearchBox component elsewhere */ }} />
    </div>
  );
}
