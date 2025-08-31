"use client";
import { useState } from "react";

export default function SearchBox() {
  const [option, setOption] = useState("pnr");
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    alert(`Searching by ${option.toUpperCase()} : ${input}`);
  };

  return (
    <div className="w-full bg-white shadow-md p-4 rounded-lg max-w-2xl mx-auto -mt-10 relative z-10">
      {/* Tabs */}
      <div className="flex justify-center gap-6 mb-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="searchOption"
            value="pnr"
            checked={option === "pnr"}
            onChange={(e) => setOption(e.target.value)}
          />
          <span className="font-medium">PNR</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="searchOption"
            value="train"
            checked={option === "train"}
            onChange={(e) => setOption(e.target.value)}
          />
          <span className="font-medium">TRAIN NAME/NO.</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="searchOption"
            value="station"
            checked={option === "station"}
            onChange={(e) => setOption(e.target.value)}
          />
          <span className="font-medium">STATION</span>
        </label>
      </div>

      {/* Input + Button */}
      <div className="flex">
        <input
          type="text"
          placeholder={`Enter ${option.toUpperCase()} Number`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border border-gray-400 px-4 py-2 rounded-l-lg focus:outline-none"
        />
        <button
          onClick={handleSubmit}
          className="bg-black text-white px-6 rounded-r-lg"
        >
          Submit
        </button>
      </div>

      {/* Small tagline */}
      <p className="text-center text-sm text-gray-600 mt-2">
        Order food in trains from trusted restaurants with freshness, hygiene and timely delivery
      </p>
    </div>
  );
}
