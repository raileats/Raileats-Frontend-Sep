"use client";

import { useEffect, useRef, useState } from "react";

export type Station = {
  StationId: number;
  StationName: string;
  StationCode?: string;
  State?: string;
  District?: string;
};

export default function StationSearchBox({
  onSelect,
}: {
  onSelect?: (s: Station | null) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const timer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!q) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);

    timer.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/search-stations?q=${encodeURIComponent(q)}`);
        const json = await resp.json();
        const data = Array.isArray(json?.data) ? json.data : [];
        setResults(data);
      } catch (err) {
        console.error("Search error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [q]);

  const handleSelect = (s: Station) => {
    setQ(`${s.StationName} (${s.StationCode})`);
    setResults([]);
    onSelect?.(s);
  };

  const handleSearchClick = () => {
    if (results.length > 0) onSelect?.(results[0]);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter station name or code..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <button
          type="button"
          className="px-4 py-2 bg-black text-white rounded"
          onClick={handleSearchClick}
        >
          Search
        </button>
      </div>

      {loading && (
        <div className="absolute mt-1 left-0 bg-white border p-2 text-sm">
          Searching…
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="absolute z-50 bg-white border rounded w-full mt-1 max-h-60 overflow-auto">
          {results.map((s, idx) => (
            <div
              key={s.StationId}
              onClick={() => handleSelect(s)}
              className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
            >
              <div className="font-medium">
                {s.StationName}{" "}
                <span className="text-gray-500 text-xs">
                  ({s.StationCode})
                </span>
              </div>
              <div className="text-gray-500 text-xs">
                {s.District} {s.State ? `• ${s.State}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && q && results.length === 0 && (
        <div className="absolute z-50 bg-white border rounded w-full mt-1 p-2 text-sm text-gray-500">
          No stations found
        </div>
      )}
    </div>
  );
}
