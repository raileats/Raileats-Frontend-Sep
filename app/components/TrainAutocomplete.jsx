"use client";

import React, { useEffect, useState, useRef } from "react";

export default function TrainAutocomplete({ value, onChange, onSelect = () => {} }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const delay = setTimeout(() => {
      if (!value || value.length < 1) {
        setSuggestions([]);
        setOpen(false);
        return;
      }

      fetch(`/api/trains?search=${value}`)
        .then((res) => res.json())
        .then((data) => {
          const trains = (data || []).map((t) => ({
            trainNumber: t.train_no,
            trainName: t.train_name,
          }));

          setSuggestions(trains);
          setOpen(trains.length > 0);
        })
        .catch(() => {
          setSuggestions([]);
          setOpen(false);
        });
    }, 300);

    return () => clearTimeout(delay);
  }, [value]);

  function handleSelect(item) {
    const display = `${item.trainNumber} - ${item.trainName}`;
    onChange(display);
    onSelect(item);
    setOpen(false);
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <input
        type="text"
        value={value}
        placeholder="Enter train number or train name"
        onChange={(e) => onChange(e.target.value)}
        className="w-full border px-3 py-2 rounded"
      />

      {open && (
        <div className="absolute w-full bg-white border shadow max-h-60 overflow-auto z-50">
          {suggestions.map((item, idx) => (
            <div
              key={idx}
              onClick={() => handleSelect(item)}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
            >
              {item.trainNumber} — {item.trainName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
