"use client";

import React, { useEffect, useState, useRef } from "react";

function useDebouncedValue(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/*
Props:
  value?: string
  onChange?: (val: string) => void
  onSelect?: (item) => void
*/
export default function TrainAutocomplete({ value, onChange, onSelect = () => {} }) {
  const [localQuery, setLocalQuery] = useState("");
  const query = value !== undefined ? value : localQuery;
  const debouncedQuery = useDebouncedValue(query || "", 300);

  const [suggestions, setSuggestions] = useState([]); // { trainId, trainNumber, trainName, sampleRow }
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  // safe onSelect wrapper
  function safeCallOnSelect(item) {
    try {
      void onSelect(item);
    } catch (e) {
      console.error("onSelect error:", e);
    }
  }

  // Convert server rows (route rows) into unique train suggestions:
  function rowsToTrains(rows) {
    if (!Array.isArray(rows)) return [];
    const seen = new Map(); // key -> sampleRow
    for (const r of rows) {
      // try multiple locations for train number/name
      const raw = r || {};
      const tn = raw.trainNumber ?? raw.trainNumber_text ?? raw?.raw?.trainNumber ?? raw?.raw?.trainId ?? raw?.trainId ?? null;
      const name = raw.trainName ?? raw?.raw?.trainName ?? null;
      const key = String(tn ?? name ?? raw?.trainId ?? raw?.trainId ?? JSON.stringify(raw)).trim();
      if (!seen.has(key)) {
        seen.set(key, { trainId: raw.trainId ?? raw?.raw?.trainId ?? null, trainNumber: tn, trainName: name, sampleRow: raw });
      }
    }
    // return array preserving insertion order
    return Array.from(seen.values()).map((it) => ({
      trainId: it.trainId,
      trainNumber: it.trainNumber != null ? String(it.trainNumber) : null,
      trainName: it.trainName != null ? String(it.trainName) : "",
      sampleRow: it.sampleRow,
    }));
  }

  async function runSearch(q) {
    if (!q || q.trim().length < 1) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    setSuggestions([]);
    setOpen(false);

    try {
      // call server endpoint (two-step server logic handles exact/partial)
      const res = await fetch(`/api/train-routes?train=${encodeURIComponent(q)}&mode=partial`, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      console.debug("[TrainAutocomplete] server response", res.status, j);
      if (!res.ok) {
        // server returned 404 or error
        console.warn("[TrainAutocomplete] server returned error or empty", j);
        setSuggestions([]);
        setOpen(false);
      } else {
        const rows = j?.rows || [];
        const trains = rowsToTrains(rows);
        setSuggestions(trains);
        setOpen(trains.length > 0);
      }
    } catch (err) {
      console.error("[TrainAutocomplete] unexpected error", err);
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runSearch(debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  function handleInputChange(e) {
    const v = e.target.value;
    if (onChange) onChange(v);
    else setLocalQuery(v);
  }

  function handleSelect(item) {
    // build display text: prefer "11016 — Train Name"
    const num = item?.trainNumber ?? (item?.sampleRow?.raw?.trainNumber ?? item?.sampleRow?.trainNumber ?? null);
    const name = item?.trainName ?? (item?.sampleRow?.raw?.trainName ?? item?.sampleRow?.trainName ?? "");
    const disp = num ? `${String(num)} - ${String(name || "").trim()}`.trim() : String(name || "");
    if (onChange) onChange(disp);
    else setLocalQuery(disp);
    safeCallOnSelect(item);
    setOpen(false);
  }

  // click outside close
  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <input
        type="text"
        value={query || ""}
        placeholder="Enter train number or train name"
        onChange={handleInputChange}
        onFocus={() => (suggestions.length > 0 ? setOpen(true) : null)}
        className="w-full border px-3 py-2 rounded"
      />

      {open && (
        <div className="absolute w-full bg-white shadow border max-h-64 overflow-auto z-50 rounded">
          {loading && <div className="p-2 text-sm">Searching...</div>}
          {!loading && suggestions.length === 0 && <div className="p-2 text-sm text-gray-600">No trains found</div>}

          {suggestions.map((item, idx) => {
            // display safe label with fallbacks
            const num = item.trainNumber ?? item?.sampleRow?.raw?.trainNumber ?? item?.sampleRow?.trainNumber ?? "";
            const name = item.trainName ?? item?.sampleRow?.raw?.trainName ?? item?.sampleRow?.trainName ?? "";
            const label = (num ? `${num} — ${name}` : name || "(unknown train)").trim();

            return (
              <div
                key={item.trainId ?? `${num}_${name}_${idx}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(item);
                }}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100"
              >
                <div className="font-medium">{label}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
