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
Controlled props:
  value?: string
  onChange?: (val) => void
  onSelect?: (item) => void
*/
export default function TrainAutocomplete({ value, onChange, onSelect = () => {} }) {
  const [localQuery, setLocalQuery] = useState("");
  const query = value !== undefined ? value : localQuery;
  const debouncedQuery = useDebouncedValue(query || "", 250);

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

  async function runSearch(q) {
    if (!q || q.trim().length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }

    const clean = String(q).trim();
    const digitsOnly = clean.replace(/\D+/g, "");
    setLoading(true);
    setResults([]);
    setOpen(false);

    try {
      // 1) If user typed >=3 digits, try exact numeric eq first (fast)
      if (digitsOnly && digitsOnly.length >= 3) {
        console.debug("[TrainAutocomplete] trying eq search for", digitsOnly);
        const { data: eqData, error: eqError } = await supabase
          .from("TrainRoute")
          .select(`"trainId","trainNumber","trainName","trainNumber_text"`)

          .eq("trainNumber", Number(digitsOnly))
          .limit(50);

        if (eqError) {
          console.warn("[TrainAutocomplete] eq search error", eqError);
        } else if (eqData && eqData.length > 0) {
          console.debug("[TrainAutocomplete] eqData rows:", eqData.length);
          setResults(eqData);
          setOpen(true);
          return;
        }
        // no eq result → continue to ilike fallback
      }

      // 2) ilike fallback: search trainNumber_text and trainName
      // Use trainNumber_text (string) to support partial numeric searches.
      console.debug("[TrainAutocomplete] trying ilike search for", clean);
      const ilikeQ = `%${clean}%`;

      // Build OR query
      const { data, error } = await supabase
        .from("TrainRoute")
        .select("trainId, trainNumber, trainName, trainNumber_text")
        .or(`trainNumber_text.ilike.${ilikeQ},trainName.ilike.${ilikeQ}`)
        .limit(50);

      if (error) {
        console.error("[TrainAutocomplete] ilike search error", error);
        setResults([]);
        setOpen(false);
      } else {
        console.debug("[TrainAutocomplete] ilike rows:", (data || []).length);
        setResults(data || []);
        setOpen((data || []).length > 0);
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
              key={item.trainId || `${item.trainNumber}_${item.trainName}`}
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
