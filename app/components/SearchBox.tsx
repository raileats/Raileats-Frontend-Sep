"use client";

import { useState } from "react";
import StationSearchBox, { Station } from "./StationSearchBox";

export default function SearchBox() {
  const [searchType, setSearchType] = useState<"pnr" | "train" | "station">("pnr");
  const [inputValue, setInputValue] = useState("");
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(false);

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

    setLoading(true);

    if (searchType === "station") {
      const rawCode = selectedStation?.StationCode ?? extractStationCode(inputValue);
      const safe = encodeURIComponent(String(rawCode).toUpperCase());
      const target = `/Stations/${safe}`;

      // small delay to ensure spinner renders then navigate
      setTimeout(() => {
        window.location.href = target;
      }, 40);

      return;
    }

    // fallback for other types: use router navigation if you prefer
    // Using window.location for consistent spinner behaviour:
    if (searchType === "pnr") {
      window.location.href = `/pnr/${encodeURIComponent(inputValue.trim())}`;
      return;
    }
    window.location.href = `/trains/${encodeURIComponent(inputValue.trim())}`;
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
                setSelectedStation(null);
              }}
            />
            <span className="capitalize">{type}</span>
          </label>
        ))}
      </div>

      <div className="px-3">
        <div className="w-full rounded-md border overflow-hidden p-3">
          {searchType === "station" ? (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <StationSearchBox
                  initialValue={inputValue}
                  onSelect={(s) => {
                    const val = s ? (s.StationCode ?? s.StationName ?? "") : "";
                    const display = s ? `${s.StationName}${s.StationCode ? ` (${s.StationCode})` : ""}` : "";
                    setInputValue(display || val);
                    setSelectedStation(s || null);
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setInputValue("");
                    setSelectedStation(null);
                  }}
                  disabled={loading}
                  className="px-3 py-2 border rounded bg-white hover:bg-gray-50 text-sm"
                >
                  Clear
                </button>

                <div className="relative">
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className={`px-4 py-2 bg-black text-white rounded text-sm ${loading ? "opacity-70 cursor-wait" : ""}`}
                  >
                    Search
                  </button>

                  {/* spinner bubble to the right of the search button */}
                  {loading && (
                    <div
                      aria-hidden
                      className="absolute -right-12 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center shadow animate-spin"
                      style={{ background: "#fff" }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          border: "2px solid rgba(0,0,0,0.15)",
                          borderTopColor: "#111",
                        }}
                      />
                    </div>
                  )}
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
                className="min-w-0 flex-1 px-2 py-2 text-sm outline-none border rounded"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="shrink-0 ml-2 w-24 px-3 py-2 text-sm bg-black text-white hover:bg-gray-800 rounded"
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
