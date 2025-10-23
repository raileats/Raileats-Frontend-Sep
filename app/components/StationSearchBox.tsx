"use client";

import React, { useEffect, useRef, useState } from "react";

export type Station = {
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
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const timer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // debug flag - set to true to get more console logs
  const DEBUG = true;

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
        const endpoint = `/api/search-stations?q=${encodeURIComponent(q)}`;
        if (DEBUG) console.log("[StationSearchBox] fetching", endpoint);
        const resp = await fetch(endpoint);
        if (!resp.ok) {
          const txt = await resp.text().catch(() => "");
          console.error("[StationSearchBox] fetch failed", resp.status, txt);
          setResults([]);
        } else {
          const text = await resp.text().catch(() => "");
          if (DEBUG) console.log("[StationSearchBox] raw response text:", text);
          let parsed: any = null;
          try {
            parsed = JSON.parse(text);
          } catch (e) {
            // not JSON — maybe plain array? try to handle gracefully
            if (DEBUG) console.warn("[StationSearchBox] response not JSON:", e);
            parsed = text;
          }

          // Normalise into array of stations
          let data: any[] = [];
          if (Array.isArray(parsed)) {
            data = parsed;
          } else if (parsed && Array.isArray(parsed.data)) {
            data = parsed.data;
          } else if (parsed && Array.isArray(parsed?.data?.data)) {
            // sometimes proxies nest: { data: { data: [...] } }
            data = parsed.data.data;
          } else if (parsed && parsed.status && Array.isArray(parsed.data)) {
            data = parsed.data;
          } else {
            // give one more chance: if parsed is object with numeric keys -> convert
            if (parsed && typeof parsed === "object") {
              const maybeArray = Object.values(parsed).filter((v) => Array.isArray(v)).flat();
              if (maybeArray.length) data = maybeArray;
            }
          }

          if (DEBUG) console.log("[StationSearchBox] normalized data:", data);
          // Try to coerce items into Station shape
          const stations: Station[] = (data || []).map((item: any) => ({
            StationId: item.StationId ?? item.id ?? item.station_id ?? Math.random(),
            StationName: item.StationName ?? item.name ?? item.stationName ?? "",
            StationCode: item.StationCode ?? item.code ?? item.stationCode ?? "",
            State: item.State ?? item.state ?? "",
            District: item.District ?? item.district ?? "",
          }));

          setResults(stations);
          setActiveIndex(stations.length > 0 ? 0 : -1);
        }
      } catch (err) {
        console.error("[StationSearchBox] fetch error:", err);
        setResults([]);
        setActiveIndex(-1);
      } finally {
        setLoading(false);
      }
    }, 300);

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
      <div className="flex gap-2 items-center">
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
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-2 bg-gray-100 border rounded"
          aria-label="Clear station search"
        >
          Clear
        </button>

        <button
          type="button"
          onClick={() => {
            // if there's active selection, call onSelect; otherwise leave as is
            if (activeIndex >= 0 && results[activeIndex]) {
              handleSelect(results[activeIndex]);
            } else if (results.length === 1) {
              handleSelect(results[0]);
            } else {
              // no selection - log for debug
              if (DEBUG) console.log("[StationSearchBox] Search button clicked, no explicit selection. q:", q, "results:", results);
            }
          }}
          className="px-4 py-2 bg-black text-white border rounded"
          aria-label="Search station"
        >
          Search
        </button>
      </div>

      {loading && <div className="absolute mt-1 left-0 bg-white border p-2 text-sm">Searching…</div>}

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
                key={String(s.StationId) + "-" + idx}
                role="option"
                aria-selected={isActive}
                className={`p-2 hover:bg-gray-100 cursor-pointer ${isActive ? "bg-gray-100" : ""}`}
                onClick={() => handleSelect(s)}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <div className="text-sm font-medium">
                  {s.StationName} <span className="text-xs text-gray-500">({s.StationCode || ""})</span>
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
