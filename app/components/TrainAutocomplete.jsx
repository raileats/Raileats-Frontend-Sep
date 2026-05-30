"use client";

import { useEffect, useRef, useState } from "react";

export default function TrainAutocomplete({ value, onChange, onSelect }) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!value) {
      setList([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/trains?search=${encodeURIComponent(value)}`);
        const data = await res.json();

        setList(data || []);
        setOpen((data || []).length > 0);
      } catch {
        setList([]);
        setOpen(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(item) {
    const trainNo = item.train_no || item.trainNumber || "";
    const trainName = item.train_name || item.trainName || "Train";
    const display = `${trainNo} - ${trainName}`;

    onChange(display);
    if (onSelect) onSelect(item);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative w-full">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter train number or train name"
        className="app-input"
      />

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
          {list.map((t, i) => {
            const trainNo = t.train_no || t.trainNumber || "";
            const trainName = t.train_name || t.trainName || "Train";

            return (
              <button
                key={`${trainNo}-${i}`}
                type="button"
                onClick={() => handleSelect(t)}
                className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left hover:bg-orange-50"
              >
                <div>
                  <div className="font-black text-slate-900">{trainNo}</div>
                  <div className="text-sm font-semibold text-slate-500">
                    {trainName}
                  </div>
                </div>

                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-600">
                  Select
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
