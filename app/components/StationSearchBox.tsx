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

  // helper to call backend search
  const doSearch = async (term: string) => {
    if (!term || term.trim().length === 0) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`/api/search-stations?q=${encodeURIComponent(term.trim())}`, {
        cache: "no-store",
      });
      if (!resp.ok) {
        console.error("search-stations proxy failed:", resp.status);
        setResults([]);
      } else {
        const json = await resp.json();
        const data = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
          ? json
          : json?.data ?? [];
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

  // debounced query
  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (!q) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }
    timer.current = window.setTimeout(() => doSearch(q), 300);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [q]);

  // click outside closes results
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

  // --- NEW: remove duplicate top buttons that may exist elsewhere on page ---
  useEffect(() => {
    // run after mount once
    const container = containerRef.current;
    if (!container) return;

    // helper: hide nodes that look like duplicate search/clear buttons and are outside our container
    const hideDuplicateButtons = () => {
      const candidates = Array.from(document.querySelectorAll("button, input[type='button'], input[type='submit']"));
      for (const el of candidates) {
        if (container.contains(el)) continue; // skip our own buttons
        const text = (el.textContent || (el as HTMLInputElement).value || "").trim().toLowerCase();
        // match typical labels that are duplicate on the page
        if (text === "search" || text === "clear" || text === "search ") {
          // hide it (do not remove DOM structure to avoid breaking other scripts)
          (el as HTMLElement).style.display = "none";
        }
      }
    };

    // call once now
    hideDuplicateButtons();

    // also observe DOM mutations for a short time (in case page renders the other buttons later)
    const mo = new MutationObserver(() => hideDuplicateButtons());
    mo.observe(document.body, { childList: true, subtree: true });

    // stop observing after 5s (performance)
    const timerId = window.setTimeout(() => {
      mo.disconnect();
    }, 5000);

    return () => {
      mo.disconnect();
      clearTimeout(timerId);
    };
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
    <div ref={containerRef} className="relative w-full max-w-lg mx-auto" aria-haspopup="listbox">
      <div className="flex items-center gap-2">
        {/* input */}
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

        {/* Right-side controls: Clear + Search (ONLY these; any external duplicates will be hidden by the effect above) */}
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

      {loading && (
        <div className="absolute mt-1 left-0 bg-white border p-2 text-sm">Searching…</div>
      )}

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
        <div className="absolute z-50 bg-white border rounded w-full mt-1 p-2 text-sm text-gray-500">
          No stations found
        </div>
      )}
    </div>
  );
}
