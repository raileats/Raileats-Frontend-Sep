"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StationSearchBox from "./StationSearchBox";

export default function SearchBox() {
  const router = useRouter();
  const [searchType, setSearchType] = useState<"pnr" | "train" | "station">("pnr");
  const [inputValue, setInputValue] = useState("");

  const extractStationCode = (val: string) => {
    const m = val.match(/\(([^)]+)\)$/);
    if (m && m[1]) return m[1].trim();
    const hyphenMatch = val.match(/- *([A-Za-z0-9]+)/);
    if (hyphenMatch && hyphenMatch[1]) return hyphenMatch[1].trim();
    const parts = val.trim().split(/\s+/);
    const last = parts[parts.length - 1];
    if (last && last.length <= 6) return last.trim();
    return val.trim();
  };

  const handleSearch = () => {
    if (!inputValue || inputValue.trim() === "") {
      alert("Please enter value");
      return;
    }
    const q = inputValue.trim();

    if (searchType === "station") {
      const rawCode = extractStationCode(q);
      const safe = encodeURIComponent(rawCode.toUpperCase());
      router.push(`/Stations/${safe}`);
      return;
    }

    if (searchType === "pnr") {
      router.push(`/pnr/${encodeURIComponent(q)}`);
      return;
    }
    router.push(`/trains/${encodeURIComponent(q)}`);
  };

  return (
    <div className="mt-4 w-full max-w-xl mx-auto bg-white rounded-lg shadow p-4">
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
                setInputValue("");
              }}
            />
            <span className="capitalize">{type}</span>
          </label>
        ))}
      </div>

      <div className="px-3">
        <div className="w-full rounded-md border overflow-hidden">
          {searchType === "station" ? (
            // StationSearchBox renders input + dropdown; no Clear/Search buttons here
            <div className="p-2">
              <StationSearchBox
                onSelect={(s) => {
                  const val = s ? (s.StationCode ?? s.StationName ?? "") : "";
                  const display = s ? `${s.StationName}${s.StationCode ? ` (${s.StationCode})` : ""}` : "";
                  setInputValue(display || val);
                }}
              />
            </div>
          ) : (
            <div className="flex items-stretch px-2">
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
                className="min-w-0 flex-1 px-2 py-2 text-sm outline-none"
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
