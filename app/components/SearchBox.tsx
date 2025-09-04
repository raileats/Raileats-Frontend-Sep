"use client";
import { useState } from "react";

export default function SearchBox() {
  const [searchType, setSearchType] = useState("pnr");
  const [inputValue, setInputValue] = useState("");

  const handleSearch = () => {
    if (!inputValue) {
      alert("Please enter value");
      return;
    }
    console.log(`Searching ${searchType} for: ${inputValue}`);
    // Yaha aap API call / navigation add kar sakte ho
  };

  return (
    <div className="mt-4 w-full max-w-xl mx-auto bg-white rounded-lg shadow p-4 text-center">
      {/* Radio Selection */}
      <div className="flex justify-center gap-6 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="searchType"
            value="pnr"
            checked={searchType === "pnr"}
            onChange={(e) => setSearchType(e.target.value)}
          />
          <span>PNR</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="searchType"
            value="train"
            checked={searchType === "train"}
            onChange={(e) => setSearchType(e.target.value)}
          />
          <span>Train</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="searchType"
            value="station"
            checked={searchType === "station"}
            onChange={(e) => setSearchType(e.target.value)}
          />
          <span>Station</span>
        </label>
      </div>

      {/* Input + Button (fixed alignment) */}
      <div className="flex">
        <input
          type="text"
          placeholder={
            searchType === "pnr"
              ? "Enter PNR Number"
              : searchType === "train"
              ? "Enter Train Number"
              : "Enter Station Code"
          }
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-grow px-4 py-2 border border-gray-400 rounded-l-md focus:outline-none"
        />
        <button
          onClick={handleSearch}
          className="px-6 bg-black text-white rounded-r-md border border-gray-400 border-l-0 hover:bg-gray-800"
        >
          Search
        </button>
      </div>
    </div>
  );
}
