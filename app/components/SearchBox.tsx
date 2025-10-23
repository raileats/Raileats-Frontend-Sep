"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StationSearchBox from "./StationSearchBox";

export default function SearchBox() {
  const router = useRouter();
  const [searchType, setSearchType] = useState<"pnr" | "train" | "station">("pnr");
  const [inputValue, setInputValue] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

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

    // show navigation spinner before actually navigating
    setIsNavigating(true);

    if (searchType === "station") {
      const rawCode = extractStationCode(q);
      const safe = encodeURIComponent(rawCode.toUpperCase());
      // use window.location to ensure browser navigation leaves page (spinner visible)
      window.location.href = `/Stations/${safe}`;
      return;
    }

    if (searchType === "pnr") {
      window.location.href = `/pnr/${encodeURIComponent(q)}`;
      return;
    }
    window.location.href = `/trains/${encodeURIComponent(q)}`;
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
            <div className="p-2">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <StationSearchBox
                    onSelect={(s) => {
                      const val = s ? (s.StationCode ?? s.StationName ?? "") : "";
                      const display = s ? `${s.StationName}${s.StationCode ? ` (${s.StationCode})` : ""}` : "";
                      setInputValue(display || val);
                    }}
                  />
                </div>

                {/* Buttons block (Clear + Search + spinner) placed right of input */}
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => setInputValue("")}
                    className="px-3 py-2 border rounded text-sm bg-white hover:bg-gray-50"
                    type="button"
                    aria-label="Clear search"
                    disabled={isNavigating}
                  >
                    Clear
                  </button>

                  <div className="relative">
                    <button
                      onClick={handleSearch}
                      className="px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800"
                      type="button"
                      aria-label="Search"
                      disabled={isNavigating}
                    >
                      {isNavigating ? "Searching…" : "Search"}
                    </button>

                    {/* Spinner: shows only while isNavigating */}
                    {isNavigating && (
                      <div
                        aria-hidden
                        className="absolute -right-12 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center shadow-md bg-white border border-gray-200"
                      >
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img
                            src="/raileats-logo.png"
                            alt="RailEats"
                            className="w-8 h-8 object-contain"
                            style={{ pointerEvents: "none" }}
                          />
                          <style>{`
                            @keyframes pulseScale {
                              0% { transform: scale(0.9); opacity: 0.9; }
                              50% { transform: scale(1.1); opacity: 1; }
                              100% { transform: scale(0.9); opacity: 0.9; }
                            }
                            .pulse-anim {
                              animation: pulseScale 900ms ease-in-out infinite;
                            }
                          `}</style>
                          <div className="absolute inset-0 rounded-full border border-gray-200 pulse-anim" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
