// app/components/StationSearchBox.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Station = {
  StationId: number;
  StationName: string;
  StationCode?: string;
  State?: string;
  District?: string;
};

export default function StationSearchBox({ onSelect }: { onSelect?: (s: Station | null) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!q) { setResults([]); return; }
    if (timer.current) window.clearTimeout(timer.current);

    timer.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/search-stations?q=${encodeURIComponent(q)}`);
        if (!resp.ok) {
          console.error("search-stations proxy failed:", resp.status);
          setResults([]);
        } else {
          const json = await resp.json();
          // Accept either { status:200, data: [...] } or direct array
          const data = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : (json?.data ?? []));
          setResults(data);
        }
      } catch (err) {
        console.error("StationSearchBox fetch error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [q]);

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter station name or code..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <button type="button" className="px-3 py-2 bg-gray-100 border rounded" onClick={() => { setQ(""); setResults([]); onSelect?.(null); }}>
          Clear
        </button>
      </div>

      {loading && <div className="absolute mt-1 left-0 bg-white border p-2 text-sm">Searching…</div>}

      {results.length > 0 && (
        <div className="absolute z-50 bg-white border rounded w-full mt-1 max-h-60 overflow-auto">
          {results.map((s) => (
            <div
              key={s.StationId}
              className="p-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                setQ(`${s.StationName}${s.StationCode ? ` (${s.StationCode})` : ""}`);
                setResults([]);
                onSelect?.(s);
              }}
            >
              <div className="text-sm font-medium">{s.StationName} <span className="text-xs text-gray-500">({s.StationCode || ""})</span></div>
              <div className="text-xs text-gray-500">{s.District || ""}{s.State ? ` • ${s.State}` : ""}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
