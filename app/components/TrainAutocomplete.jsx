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

export default function TrainAutocomplete({ onSelect = () => {} }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef();

  // 🔍 Supabase Search
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }

    let cancel = false;

    (async () => {
      setLoading(true);

      const q = debouncedQuery.trim();

      const { data, error } = await supabase
        .from("TrainRoute")
        .select("trainId, trainNumber, trainName, trainNumber_text")
        .or(
          `trainNumber_text.ilike.%${q}%,trainName.ilike.%${q}%`
        )
        .limit(50);

      if (!cancel) {
        if (error) console.error(error);
        setResults(data || []);
        setOpen((data && data.length > 0));
      }

      setLoading(false);
    })();

    return () => {
      cancel = true;
    };
  }, [debouncedQuery]);

  // 🖱 Selection
  function handleSelect(item) {
    const label = `${item.trainNumber} - ${item.trainName}`;
    setQuery(label);
    onSelect(item);
    setOpen(false);
  }

  // 🧠 Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative w-full" ref={ref}>
      <input
        type="text"
        value={query}
        placeholder="Enter train number or train name"
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(-1);
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        className="w-full border px-3 py-2 rounded"
      />

      {/* Dropdown */}
      {open && (
        <div className="absolute w-full bg-white shadow border max-h-64 overflow-auto z-50 rounded">
          {loading && <div className="p-2 text-sm">Searching...</div>}

          {!loading && results.length === 0 && (
            <div className="p-2 text-sm text-gray-600">No trains found</div>
          )}

          {results.map((item, index) => (
            <div
              key={item.trainId}
              onMouseDown={() => handleSelect(item)}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                index === activeIndex ? "bg-gray-100" : ""
              }`}
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
