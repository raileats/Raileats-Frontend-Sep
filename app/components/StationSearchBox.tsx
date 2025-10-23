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
  initialValue = "",
}: {
  onSelect?: (s: Station | null) => void;
  initialValue?: string;
}) {
  const [q, setQ] = useState(initialValue || "");
  const [results, setResults] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const timer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // sync prop initialValue -> local
  useEffect(() => {
    setQ(initialValue || "");
    if (!initialValue) setSelectedStation(null);
  }, [initialValue]);

  // debounced search
  useEffect(() => {
    if (!q) {
      setResults([]);
      setActiveIndex(-1);
      setLoading(false);
      return;
    }

    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/search-stations?q=${encodeURIComponent(q)}`);
        if (!resp.ok) {
          setResults([]);
          setActiveIndex(-1);
        } else {
          const json = await resp.json();
          const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : json?.data ?? [];

          const filtered = (data as any[]).filter(
            (s) =>
              String(s.StationName || "").toLowerCase().includes(q.toLowerCase()) ||
              String(s.StationCode || "").toLowerCase().includes(q.toLowerCase())
          );

          setResults(filtered as Station[]);
          setActiveIndex(filtered.length > 0 ? 0 : -1);
        }
      } catch (err) {
        console.error("Station search error:", err);
        setResults([]);
        setActiveIndex(-1);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [q]);

  // click outside to close results
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
      {/* Input + inline buttons */}
      <div className="flex items-start gap-2 w-full">
        <input
          type="text"
          placeholder="Enter station name or code..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSelectedStation(null);
            onSelect?.(null);
          }}
          onKeyDown={onKeyDown}
          className="flex-1 min-w-0 border rounded px-3 py-3 text-sm sm:py-2 sm:text-sm"
          aria-autocomplete="list"
          aria-expanded={results.length > 0}
        />

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

      {/* small inline loader (simple text) */}
      {loading && (
        <div className="absolute mt-2 left-0 bg-white border p-2 text-sm rounded z-40">Searching…</div>
      )}

      {/* Results dropdown: vertical, wrapped text, 20% smaller on small screens */}
      {results.length > 0 && !selectedStation && (
        <div
          className="absolute z-50 bg-white border rounded mt-2 max-h-56 overflow-auto shadow left-0"
          style={{
            width: "80%", // mobile 80% (20% smaller)
            minWidth: 220,
            maxWidth: "60rem",
          }}
        >
          {results.map((s, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={(s as any).StationId ?? `${s.StationCode}-${idx}`}
                role="option"
                aria-selected={isActive}
                className={`p-3 hover:bg-gray-100 cursor-pointer ${isActive ? "bg-gray-100" : ""}`}
                onClick={() => handleSelect(s)}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <div className="text-sm font-medium leading-tight break-words">
                  {s.StationName}
                </div>
                <div className="text-xs text-gray-500 break-words">
                  {s.StationCode ? `(${s.StationCode}) ` : ""} {s.District ? `${s.District} • ` : ""} {s.State ?? ""}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No stations found */}
      {!loading && q && results.length === 0 && !selectedStation && (
        <div
          className="absolute z-50 bg-white border rounded mt-2 p-2 text-sm text-gray-500"
          style={{ width: "80%", minWidth: 220 }}
        >
          No stations found
        </div>
      )}
    </div>
  );
}
