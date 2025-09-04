"use client";
import { useState } from "react";

export default function SearchBox() {
  const [searchType, setSearchType] = useState<"pnr" | "train" | "station">("pnr");
  const [inputValue, setInputValue] = useState("");

  const handleChange = (val: string) => {
    if (searchType === "pnr") {
      // only digits, max 10
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
    <div className="mt-4 w-full max-w-xl mx-auto bg-white rounded-lg shadow p-4">
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

      {/* Input + Button: never overflow on mobile */}
      <div className="px-3">
        <div className="w-full rounded-md border overflow-hidden">
          <div className="flex items-stretch">
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
              className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"
            />
            {/* Fixed-width button so right edge se bahar na jaye */}
            <button
              onClick={handleSearch}
              className="shrink-0 w-20 sm:w-24 px-3 py-2 text-sm bg-black text-white hover:bg-gray-800"
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
