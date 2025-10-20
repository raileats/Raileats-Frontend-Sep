"use client";

import { useState } from "react";
import StationSearchBox from "./StationSearchBox"; // path: app/components/StationSearchBox.tsx

export default function SearchBox() {
  const [searchType, setSearchType] = useState<"pnr" | "train" | "station">("pnr");
  const [inputValue, setInputValue] = useState("");

  const handleSearch = () => {
    if (!inputValue) {
      alert("Please enter value");
      return;
    }

    // For now just log; replace with navigation or API as needed
    console.log(`Searching ${searchType} for: ${inputValue}`);
    // Example: router.push(`/search?type=${searchType}&q=${encodeURIComponent(inputValue)}`)
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
              onChange={(e) => {
                setSearchType(e.target.value as any);
                setInputValue(""); // clear input when switching types
              }}
            />
            <span className="capitalize">{type}</span>
          </label>
        ))}
      </div>

      {/* Input area */}
      <div className="px-3">
        <div className="w-full rounded-md border overflow-hidden">
          {searchType === "station" ? (
            // Use the station search component which calls /api/search-stations
            <div className="p-2">
              <StationSearchBox
                onSelect={(s) => {
                  // put station code or station name into input value so Search button can use it
                  const val = s ? (s.StationCode ?? s.StationName ?? "") : "";
                  setInputValue(val);
                }}
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-black text-white rounded"
                >
                  Search
                </button>
              </div>
            </div>
          ) : (
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
                onChange={(e) => setInputValue(e.target.value)}
                className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"
              />
              <button
                onClick={handleSearch}
                className="shrink-0 w-20 sm:w-24 px-3 py-2 text-sm bg-black text-white hover:bg-gray-800"
              >
                Search
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
