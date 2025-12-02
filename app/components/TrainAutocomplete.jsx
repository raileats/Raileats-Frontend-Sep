// app/components/TrainAutocomplete.jsx
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

  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  function safeCallOnSelect(item) {
    try {
      void onSelect(item);
    } catch (e) {
      console.error("onSelect error:", e);
    }
  }

  // fetch to server endpoint which does the DB lookup (server-side)
  async function runSearch(q) {
    if (!q || q.trim().length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }

    const clean = String(q).trim();
    const digits = clean.replace(/\D+/g, "");
    setLoading(true);
    setResults([]);
    setOpen(false);

    try {
      // Try numeric exact first if user typed digits (server endpoint should handle exact)
      if (digits && digits.length >= 3) {
        console.debug("[TrainAutocomplete] server eq lookup for", digits);
        const res = await fetch(`/api/train-routes?train=${encodeURIComponent(digits)}&mode=exact`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        console.debug("[TrainAutocomplete] server eq result:", json);
        if (res.ok && json?.ok && Array.isArray(json.rows) && json.rows.length) {
          setResults(json.rows);
          setOpen(true);
          return;
        }
      }

      // Fallback: server-side ilike / partial match
      console.debug("[TrainAutocomplete] server partial lookup for", clean);
      const res2 = await fetch(`/api/train-routes?train=${encodeURIComponent(clean)}&mode=partial`, {
        cache: "no-store",
      });
      const json2 = await res2.json().catch(() => null);
      console.debug("[TrainAutocomplete] server partial result:", json2);
      if (res2.ok && json2?.ok) {
        setResults(Array.isArray(json2.rows) ? json2.rows : (json2.rows || []));
        setOpen((json2.rows || []).length > 0);
      } else {
        console.warn("[TrainAutocomplete] server returned error or empty", res2.status, json2);
        setResults([]);
        setOpen(false);
      }
    } catch (err) {
      console.error("[TrainAutocomplete] unexpected error", err);
      setResults([]);
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
    const disp = item?.trainNumber ? `${item.trainNumber} - ${item.trainName || ""}`.trim() : (item?.trainName || "");
    if (onChange) onChange(disp);
    else setLocalQuery(disp);
    safeCallOnSelect(item);
    setOpen(false);
  }

  // click outside to close
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
        onFocus={() => (results.length > 0 ? setOpen(true) : null)}
        className="w-full border px-3 py-2 rounded"
      />

      {open && (
        <div className="absolute w-full bg-white shadow border max-h-64 overflow-auto z-50 rounded">
          {loading && <div className="p-2 text-sm">Searching...</div>}
          {!loading && results.length === 0 && (
            <div className="p-2 text-sm text-gray-600">No trains found</div>
          )}

          {results.map((item) => (
            <div
              key={item.trainId ?? `${item.trainNumber}_${item.trainName}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100"
            >
              <div className="font-medium">
                {item.trainNumber} — {item.trainName}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
