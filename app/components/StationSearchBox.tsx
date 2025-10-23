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
  const [debugMessage, setDebugMessage] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Normalize different server response shapes to Station[]
  function normalizeServerResponse(raw: any): Station[] {
    if (!raw) return [];
    // If server already returned an array
    if (Array.isArray(raw)) {
      return raw as Station[];
    }
    // If server returned { status:..., data: [...] }
    if (raw && Array.isArray(raw.data)) {
      return raw.data as Station[];
    }
    // If server returned { data: {...} } single
    if (raw && raw.data && !Array.isArray(raw.data) && typeof raw.data === "object") {
      return [raw.data as Station];
    }
    // If it's an object array under some other key, try to find first array
    if (typeof raw === "object") {
      for (const k of Object.keys(raw)) {
        if (Array.isArray((raw as any)[k])) return (raw as any)[k];
      }
    }
    return [];
  }

  // Main search function
  const doSearch = async (term: string) => {
    setDebugMessage(null);
    setResults([]);
    if (!term || term.trim().length === 0) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    try {
      const url = `/api/search-stations?q=${encodeURIComponent(term.trim())}`;
      console.debug("[StationSearchBox] fetching", url);
      const resp = await fetch(url, { cache: "no-store" });

      // show status for debug
      console.debug("[StationSearchBox] HTTP status:", resp.status);

      // try parse json, but be defensive
      const text = await resp.text();
      let parsed: any = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch (e) {
        // not JSON — log raw text
        console.warn("[StationSearchBox] response is not JSON, raw text:", text);
        parsed = text;
      }

      // If server returned HTTP error
      if (!resp.ok) {
        console.error("[StationSearchBox] server error", resp.status, parsed);
        setDebugMessage(`Server error ${resp.status}`);
        setResults([]);
        setActiveIndex(-1);
        return;
      }

      const normalized = normalizeServerResponse(parsed);
      console.debug("[StationSearchBox] normalized results:", normalized);

      setResults(normalized);
      setActiveIndex(normalized.length > 0 ? 0 : -1);

      // If no results but server returned something, show debug
      if (normalized.length === 0) {
        // show helpful debug message so you can paste it back to me if needed
        if (parsed) {
          setDebugMessage(`No stations in normalized response (server returned ${typeof parsed}). Check console.`);
        } else {
          setDebugMessage("No stations found");
        }
      }
    } catch (err: any) {
      console.error("[StationSearchBox] fetch error", err);
      setDebugMessage(`Network error: ${String(err.message ?? err)}`);
      setResults([]);
      setActiveIndex(-1);
    } finally {
      setLoading(false);
    }
  };

  // debounced search when user types
  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (!q) {
      setResults([]);
      setActiveIndex(-1);
      setDebugMessage(null);
      return;
    }
    // 300ms debounce
    timer.current = window.setTimeout(() => {
      doSearch(q);
    }, 300);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [q]);

  // close list when click outside
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

  // keyboard navigation
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
      } else {
        // fallback: do a manual search if user presses Enter without selecting
        doSearch(q);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setResults([]);
      setActiveIndex(-1);
    }
  };

  const handleClear = () => {
    setQ("");
    setResults([]);
    setActiveIndex(-1);
    setDebugMessage(null);
    onSelect?.(null);
  };

  const handleSelect = (s: Station) => {
    onSelect?.(s);
    setQ(`${s.StationName}${s.StationCode ? ` (${s.StationCode})` : ""}`);
    setResults([]);
    setActiveIndex(-1);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto" aria-haspopup="listbox">
      <div className="flex items-center gap-2">
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

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-2 bg-gray-200 rounded text-sm hover:bg-gray-300"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => doSearch(q)}
            className="px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800"
          >
            Search
          </button>
        </div>
      </div>

      {loading && <div className="mt-2 text-sm text-gray-600">Searching…</div>}

      {results.length > 0 && (
        <div
          id="station-search-list"
          role="listbox"
          className="absolute z-50 bg-white border rounded w-full mt-1 max-h-60 overflow-auto shadow-lg"
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
        <div className="mt-2 text-sm text-gray-500">No stations found</div>
      )}

      {/* debug message for troubleshooting (remove later) */}
      {debugMessage && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
          Debug: {debugMessage}
          <div className="text-xs text-gray-500 mt-1">Check browser console (Network/Console) for raw server response.</div>
        </div>
      )}
    </div>
  );
}
