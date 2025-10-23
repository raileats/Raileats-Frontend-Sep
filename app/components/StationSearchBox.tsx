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
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const timer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Debounced search
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
        const data = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
          ? json
          : json?.data ?? [];

        // basic fuzzy: name or code includes q (case-insensitive)
        const filtered = data.filter(
          (s: any) =>
            String(s.StationName || "").toLowerCase().includes(q.toLowerCase()) ||
            String(s.StationCode || "").toLowerCase().includes(q.toLowerCase())
        );

        setResults(filtered);
        setActiveIndex(filtered.length > 0 ? 0 : -1);
      } catch (err) {
        console.error("Station search error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [q]);

  // click outside to close
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setResults([]);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const handleSelect = (s: Station) => {
    setSelectedStation(s);
    onSelect?.(s);
    setQ(`${s.StationName}${s.StationCode ? ` (${s.StationCode})` : ""}`);
    setResults([]);
    setActiveIndex(-1);
  };

  const handleClear = () => {
    setQ("");
    setSelectedStation(null);
    setResults([]);
    setActiveIndex(-1);
    onSelect?.(null);
  };

  const doSearch = () => {
    // re-emit selectedStation even if already selected
    onSelect?.(selectedStation);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setResults([]);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* --- INPUT + Buttons (inline) --- */}
      <div className="flex w-full items-start gap-2">
        {/* input: slightly smaller height to match design */}
        <input
          type="text"
          placeholder="Enter station name or code..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSelectedStation(null); // reset selected on typing
          }}
          onKeyDown={onKeyDown}
          className="flex-1 min-w-0 border rounded px-3 py-2 text-sm"
        />

        {/* Buttons placed right to the input (green region) */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-2 border rounded text-sm bg-white hover:bg-gray-50"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={doSearch}
            className="px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800"
          >
            Search
          </button>
        </div>
      </div>

      {/* small loader */}
      {loading && (
        <div className="absolute mt-1 left-0 bg-white border p-2 text-sm">Searching…</div>
      )}

      {/* results dropdown — only show when there are results AND user hasn't selected a station */}
      {results.length > 0 && !selectedStation && (
        <div className="absolute z-50 bg-white border rounded w-full mt-1 max-h-60 overflow-auto shadow">
          {results.map((s, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={(s as any).StationId}
                role="option"
                aria-selected={isActive}
                className={`p-2 hover:bg-gray-100 cursor-pointer ${
                  isActive ? "bg-gray-100" : ""
                }`}
                onClick={() => handleSelect(s)}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <div className="text-sm font-medium">
                  {s.StationName}{" "}
                  <span className="text-xs text-gray-500">({s.StationCode || ""})</span>
                </div>
                <div className="text-xs text-gray-500">
                  {s.District || ""} {s.State ? `• ${s.State}` : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* "No stations found" shows only if no results and nothing selected */}
      {!loading && q && results.length === 0 && !selectedStation && (
        <div className="absolute z-50 bg-white border rounded w-full mt-1 p-2 text-sm text-gray-500">
          No stations found
        </div>
      )}
    </div>
  );
}
