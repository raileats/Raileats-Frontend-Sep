// app/components/TrainAutocomplete.jsx
"use client";

import { useEffect, useRef, useState } from "react";

export default function TrainAutocomplete({ value, onChange, onSelect }) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);

  const ref = useRef(null);
  const selectedValueRef = useRef("");
  const requestIdRef = useRef(0);

  useEffect(() => {
    const currentValue = String(value || "").trim();

    if (!currentValue || currentValue === selectedValueRef.current) {
      requestIdRef.current += 1;
      setList([]);
      setOpen(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/trains?search=${encodeURIComponent(currentValue)}`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          throw new Error("Unable to fetch trains");
        }

        const data = await res.json();

        if (requestId !== requestIdRef.current) return;

        const nextList = Array.isArray(data) ? data : [];
        setList(nextList);
        setOpen(nextList.length > 0);
      } catch (error) {
        if (error?.name === "AbortError") return;
        if (requestId !== requestIdRef.current) return;

        setList([]);
        setOpen(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
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

  function handleInputChange(e) {
    selectedValueRef.current = "";
    setOpen(false);
    onChange(e.target.value);
  }

  function handleSelect(item) {
    const trainNo = item.train_no || item.trainNumber || "";
    const trainName = item.train_name || item.trainName || "Train";
    const display = `${trainNo} - ${trainName}`;

    requestIdRef.current += 1;
    selectedValueRef.current = display;
    setList([]);
    setOpen(false);

    onChange(display);
    if (onSelect) onSelect(item);
  }

  return (
    <div ref={ref} className="relative w-full">
      <input
        value={value}
        onChange={handleInputChange}
        placeholder="Enter train number or train name"
        autoComplete="off"
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
