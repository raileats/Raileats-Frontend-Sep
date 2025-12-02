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

export default function TrainAutocomplete({ value, onChange, onSelect = () => {} }) {
  const [localQuery, setLocalQuery] = useState("");
  const query = value !== undefined ? value : localQuery;
  const debouncedQuery = useDebouncedValue(query || "", 300);

  const [suggestions, setSuggestions] = useState([]); // { trainNumber, trainName, trainId, sampleRow }
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  // Normalize a single route-row to a train suggestion (robust fallbacks)
  function normalizeRowToTrain(r) {
    if (!r) return null;
    // r can be "mapped row" (with r.raw) or a raw DB row.
    const raw = r.raw ?? r;

    // try multiple locations for numeric/text number and name
    const tnCandidates = [
      r.trainNumber,
      r.trainNumber_text,
      raw?.trainNumber,
      raw?.trainNumber_text,
      raw?.trainId,
    ];

    const nameCandidates = [
      r.trainName,
      raw?.trainName,
      raw?.name,
    ];

    const trainNumber = tnCandidates.find((x) => x !== undefined && x !== null && String(x).trim() !== "");
    const trainName = nameCandidates.find((x) => x !== undefined && x !== null) || "";

    const trainId = raw?.trainId ?? r.trainId ?? null;

    if (!trainNumber && !trainName) return null;

    return {
      trainId,
      trainNumber: trainNumber != null ? String(trainNumber) : "",
      trainName: String(trainName || ""),
      sampleRow: r,
    };
  }

  // Reduce rows -> unique trains (preserve order)
  function rowsToUniqueTrains(rows) {
    if (!Array.isArray(rows)) return [];
    const seen = new Set();
    const out = [];
    for (const r of rows) {
      const t = normalizeRowToTrain(r);
      if (!t) continue;
      const key = `${t.trainNumber}|${t.trainName}`; // dedupe by number+name
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
    return out;
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
      const res = await fetch(`/api/train-routes?train=${encodeURIComponent(q)}&mode=partial`, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      console.debug("[TrainAutocomplete] server response", res.status, j);
      if (!res.ok || !j) {
        setSuggestions([]);
        setOpen(false);
      } else {
        const rows = j.rows || [];
        const trains = rowsToUniqueTrains(rows);
        setSuggestions(trains);
        setOpen(trains.length > 0);
        // debug: print suggestions
        console.debug("[TrainAutocomplete] suggestions", trains);
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
    const num = item?.trainNumber ?? "";
    const name = item?.trainName ?? "";
    const disp = num ? `${num} — ${name}`.trim() : String(name || "");
    if (onChange) onChange(disp);
    else setLocalQuery(disp);
    try {
      onSelect(item);
    } catch (e) {
      console.error("onSelect error", e);
    }
    setOpen(false);
  }

  // close on outside click
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
            const label = item.trainNumber ? `${item.trainNumber} — ${item.trainName || "(no name)"}` : item.trainName || "(unknown train)";
            return (
              <div
                key={item.trainId ?? `${item.trainNumber}_${idx}`}
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
