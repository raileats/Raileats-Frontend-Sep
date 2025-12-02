"use client";

import React, { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
 - value?: string              // controlled value (optional)
 - onChange?: (val: string)    // called when user types
 - onSelect?: (item)           // called when user selects a suggestion
*/
export default function TrainAutocomplete({ value, onChange, onSelect = () => {} }) {
  // internal state only used when parent doesn't control
  const [localQuery, setLocalQuery] = useState("");
  const query = value !== undefined ? value : localQuery;

  const debouncedQuery = useDebouncedValue(query, 250);
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  // Wrapper to call parent select handler safely
  function callOnSelect(item) {
    try {
      void onSelect(item);
    } catch (e) {
      console.error("onSelect error", e);
    }
  }

  // search
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      const q = debouncedQuery.trim();

      try {
        const { data, error } = await supabase
          .from("TrainRoute")
          .select("trainId, trainNumber, trainName, trainNumber_text")
          .or(`trainNumber_text.ilike.%${q}%,trainName.ilike.%${q}%`)
          .limit(50);

        if (!cancelled) {
          if (error) {
            console.error("Supabase search error:", error);
            setResults([]);
            setOpen(false);
          } else {
            setResults(data || []);
            setOpen((data || []).length > 0);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  function handleInputChange(e) {
    const v = e.target.value;
    if (onChange) onChange(v);
    else setLocalQuery(v);
  }

  function handleSelect(item) {
    const display = item.trainNumber ? `${item.trainNumber} - ${item.trainName || ""}`.trim() : (item.trainName || "");
    // update parent input value so controlled parent gets the selected train number/name
    if (onChange) onChange(display);
    else setLocalQuery(display);

    callOnSelect(item);
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
        value={query}
        placeholder="Enter train number or train name"
        onChange={handleInputChange}
        onFocus={() => results.length > 0 && setOpen(true)}
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
              key={item.trainId}
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
