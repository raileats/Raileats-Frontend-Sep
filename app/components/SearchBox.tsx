"use client";

import { useState, useEffect, useRef } from "react";

export default function TrainAutocomplete({
  value,
  onChange,
  onSelect,
}) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    if (!value) {
      setList([]);
      setOpen(false);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/trains?search=${value}`);
        const data = await res.json();

        setList(data || []);
        setOpen((data || []).length > 0);
      } catch {
        setList([]);
        setOpen(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [value]);

  function handleSelect(item) {
    const display = `${item.train_no} - ${item.train_name}`;
    onChange(display);

    // ✅ FIX: pass parameter
    if (onSelect) onSelect(item);

    setOpen(false);
  }

  // close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter train number or name"
        className="w-full border p-2"
      />

      {open && (
        <div className="absolute bg-white border w-full z-50 max-h-60 overflow-auto">
          {list.map((t, i) => (
            <div
              key={i}
              onClick={() => handleSelect(t)}
              className="p-2 hover:bg-gray-200 cursor-pointer"
            >
              {t.train_no} - {t.train_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
