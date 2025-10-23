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

  useEffect(() => {
    setQ(initialValue || "");
    if (!initialValue) setSelectedStation(null);
  }, [initialValue]);

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
    }, 250);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [q]);

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
        className="w-full border rounded px-3 py-2 text-sm"
      />

      {/* small loader text (optional) */}
      {loading && <div className="absolute mt-1 left-0 bg-white border p-2 text-sm">Searching…</div>}

      {/* RESULTS DROPDOWN */}
      {results.length > 0 && !selectedStation && (
        <div
          className="absolute z-50 bg-white border rounded w-full mt-1 max-h-60 overflow-auto shadow"
          style={{ top: "calc(100% + 6px)" }}
        >
          {results.map((s, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={(s as any).StationId}
                role="option"
                aria-selected={isActive}
                className={`p-2 hover:bg-gray-100 cursor-pointer ${isActive ? "bg-gray-100" : ""}`}
                onClick={() => handleSelect(s)}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <div className="text-sm font-medium">
                  {s.StationName} <span className="text-xs text-gray-500">({s.StationCode || ""})</span>
                </div>
                <div className="text-xs text-gray-500">{s.District || ""} {s.State ? `• ${s.State}` : ""}</div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && q && results.length === 0 && !selectedStation && (
        <div className="absolute z-50 bg-white border rounded w-full mt-1 p-2 text-sm text-gray-500">
          No stations found
        </div>
      )}
    </div>
  );
}
