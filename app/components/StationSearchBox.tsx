// app/components/StationSearchBox.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

export type Station = {
  StationId: number | null;
  StationName: string;
  StationCode?: string;
  State?: string;
  District?: string;
};

export default function StationSearchBox({ onSelect }: { onSelect?: (s: Station | null) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const timer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // fetch helper
  const doSearch = async (term: string) => {
    if (!term || term.trim().length === 0) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`/api/search-stations?q=${encodeURIComponent(term.trim())}`, { cache: "no-store" });
      if (!resp.ok) {
        console.error("search-stations proxy failed:", resp.status);
        setResults([]);
      } else {
        const json = await resp.json();
        // API returns { status:200, data: [...] }
        const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : json?.data ?? [];
        setResults(data);
        setActiveIndex(data.length > 0 ? 0 : -1);
      }
    } catch (err) {
      console.error("StationSearchBox fetch error:", err);
      setResults([]);
      setActiveIndex(-1);
    } finally {
      setLoading(false);
    }
  };

  // debounce q changes
  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (!q) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }
    timer.current = window.setTimeout(() => doSearch(q), 250);
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

  const handleClear = () => {
    setQ("");
    setResults([]);
    setActiveIndex(-1);
    onSelect?.(null);
  };

  const handleSelect = (s: Station) => {
    onSelect?.(s);
    setQ(`${s.StationName}${s.StationCode ? ` (${s.StationCode})` : ""}`);
    setResults([]);
    setActiveIndex(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        handleSelect(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setResults([]);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full" aria-haspopup="listbox">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter station name or code..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          aria-activedescendant={activeIndex >= 0 ? `station-item-${results[activeIndex].StationId}` : undefined}
          aria-autocomplete="list"
          aria-controls="station-search-list"
          className="w-full border rounded px-3 py-2"
        />
        {/* single Search button (replaces duplicate Clear) */}
        <button
          type="button"
          className="px-3 py-2 bg-black text-white rounded"
          onClick={() => doSearch(q)}
          aria-label="Search stations"
        >
          Search
        </button>
      </div>

      {loading && (
        <div className="absolute mt-1 left-0 bg-white border p-2 text-sm">Searching…</div>
      )}

      {results.length > 0 && (
        <div
          id="station-search-list"
          role="listbox"
          className="absolute z-50 bg-white border rounded w-full mt-1 max-h-60 overflow-auto"
        >
          {results.map((s, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                id={`station-item-${s.StationId}`}
                key={`${s.StationId}-${idx}`}
                role="option"
                aria-selected={isActive}
                className={`p-2 hover:bg-gray-100 cursor-pointer ${isActive ? "bg-gray-100" : ""}`}
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

      {!loading && q && results.length === 0 && (
        <div className="absolute z-50 bg-white border rounded w-full mt-1 p-2 text-sm text-gray-500">
          No stations found
        </div>
      )}
    </div>
  );
}
