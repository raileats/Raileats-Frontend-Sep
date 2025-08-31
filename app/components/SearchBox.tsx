"use client";
import { useState } from "react";

export default function SearchBox() {
  const [mode, setMode] = useState("pnr");
  const [input, setInput] = useState("");

  const handleSearch = () => {
    alert(`Searching by ${mode.toUpperCase()} → ${input}`);
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-4 max-w-xl mx-auto -mt-10 relative z-20">
      {/* Radio Options */}
      <div className="flex justify-center space-x-6 mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            value="pnr"
            checked={mode === "pnr"}
            onChange={(e) => setMode(e.target.value)}
          />
          <span className="text-sm font-medium">PNR</span>
        </label>
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            value="train"
            checked={mode === "train"}
            onChange={(e) => setMode(e.target.value)}
          />
          <span className="text-sm font-medium">Train</span>
        </label>
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            value="station"
            checked={mode === "station"}
            onChange={(e) => setMode(e.target.value)}
          />
          <span className="text-sm font-medium">Station</span>
        </label>
      </div>

      {/* Input + Submit */}
      <div className="flex rounded-full border border-gray-300 overflow-hidden">
        <input
          type="text"
          placeholder={`Enter ${mode.toUpperCase()} Number`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-4 py-2 outline-none"
        />
        <button
          onClick={handleSearch}
          className="bg-black text-white px-6 font-semibold"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
