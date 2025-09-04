"use client";
import { useState } from "react";

export default function SearchBox() {
  const [searchType, setSearchType] = useState<"pnr" | "train" | "station">("pnr");
  const [inputValue, setInputValue] = useState("");

  const handleChange = (val: string) => {
    if (searchType === "pnr") {
      // only digits, cap at 10
      const digits = val.replace(/\D/g, "").slice(0, 10);
      setInputValue(digits);
    } else {
      setInputValue(val);
    }
  };

  const handleSearch = () => {
    if (!inputValue) {
      alert("Please enter value");
      return;
    }
    console.log(`Searching ${searchType} for: ${inputValue}`);
    // TODO: API call / navigation
  };

  return (
    <div className="mt-4 w-full max-w-xl mx-auto bg-white rounded-lg shadow p-4 text-center">
      {/* Radio Selection */}
      <div className="flex justify-center gap-6 mb-4">
        {(["pnr", "train", "station"] as const).map((type) => (
          <label key={type} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="searchType"
              value={type}
              checked={searchType === type}
              onChange={(e) => setSearchType(e.target.value as any)}
            />
            <span className="capitalize">{type}</span>
          </label>
        ))}
      </div>

      {/* Input + Button - tighter mobile gutters */}
      <div className="flex px-2 sm:px-3">
        <input
          type={searchType === "pnr" ? "tel" : "text"}
          inputMode={searchType === "pnr" ? "numeric" : "text"}
          maxLength={searchType === "pnr" ? 10 : undefined}
          placeholder={
            searchType === "pnr"
              ? "Enter 10-digit PNR"
              : searchType === "train"
              ? "Enter Train Number"
              : "Enter Station Code"
          }
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          className="flex-grow px-4 py-2 border border-gray-400 rounded-l-md focus:outline-none text-sm"
        />
        <button
          onClick={handleSearch}
          className="bg-black text-white px-6 py-2 rounded-r-md border border-gray-400 border-l-0 hover:bg-gray-800 mr-2"
        >
          Search
        </button>
      </div>
    </div>
  );
}
