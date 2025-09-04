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
        {["pnr", "train", "station"].map((type) => (
          <label key={type} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="searchType"
              value={type}
              checked={searchType === type}
              onChange={(e) => setSearchType(e.target.value)}
            />
            <span className="capitalize">{type}</span>
          </label>
        ))}
      </div>

      {/* Input + Button */}
      <div className="flex px-1"> {/* 👈 mobile me thoda andar laya */}
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
          className="flex-grow px-4 py-2 border border-gray-400 rounded-l-md focus:outline-none text-sm"
        />
        <button
          onClick={handleSearch}
          className="bg-black text-white px-6 py-2 rounded-r-md border border-gray-400 border-l-0 hover:bg-gray-800 mr-1"
        >
          Search
        </button>
      </div>
    </div>
  );
}
