"use client";
import { useState } from "react";

export default function SearchBox() {
  const [searchType, setSearchType] = useState<"pnr" | "train" | "station">("pnr");
  const [inputValue, setInputValue] = useState("");

  const handleChange = (val: string) => {
    if (searchType === "pnr") {
      const digits = val.replace(/\D/g, "").slice(0, 10); // only 10
      setInputValue(digits);
    } else setInputValue(val);
  };

  const handleSearch = () => {
    if (!inputValue) return alert("Please enter value");
    console.log(`Searching ${searchType} for: ${inputValue}`);
  };

  return (
    <div className="mt-4 w-full max-w-xl mx-auto bg-white rounded-lg shadow p-4">
      {/* Radios */}
      <div className="flex justify-center gap-6 mb-4">
        {(["pnr","train","station"] as const).map(t=>(
          <label key={t} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="searchType" value={t}
              checked={searchType===t} onChange={e=>setSearchType(e.target.value as any)} />
            <span className="capitalize">{t}</span>
          </label>
        ))}
      </div>

      {/* Group: never overflows on mobile */}
      <div className="px-3">
        <div className="w-full rounded-md border overflow-hidden">
          <div className="flex items-stretch">
            <input
              type={searchType==="pnr" ? "tel" : "text"}
              inputMode={searchType==="pnr" ? "numeric" : "text"}
              maxLength={searchType==="pnr" ? 10 : undefined}
              placeholder={
                searchType==="pnr" ? "Enter 10-digit PNR"
                : searchType==="train" ? "Enter Train Number"
                : "Enter Station Code"
              }
              value={inputValue}
              onChange={(e)=>handleChange(e.target.value)}
              className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"
            />
            {/* fixed, small button that stays inside */}
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
