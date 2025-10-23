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

    // start spinner ONLY on search click
    setLoading(true);

    if (searchType === "station") {
      const rawCode = selectedStation?.StationCode ?? extractStationCode(inputValue);
      const safe = encodeURIComponent(String(rawCode).toUpperCase());
      const target = `/Stations/${safe}`;

      // small timeout so spinner gets a render before navigation
      setTimeout(() => {
        window.location.href = target;
      }, 50);
      return;
    }

    if (searchType === "pnr") {
      setTimeout(() => (window.location.href = `/pnr/${encodeURIComponent(inputValue.trim())}`), 50);
      return;
    }

    setTimeout(() => (window.location.href = `/trains/${encodeURIComponent(inputValue.trim())}`), 50);
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
        {/* removed overflow-hidden to avoid clipping dropdown */}
        <div className="w-full rounded-md border p-3"> 
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

                  {/* Bubble spinner to right of Search button */}
                  {loading && (
                    <div
                      aria-hidden
                      className="absolute -right-12 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center shadow"
                      style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)" }}
                    >
                      {/* Try to use logo: public/raileats-logo.png — fallback to CSS spinner */}
                      <img
                        src="/raileats-logo.png"
                        alt="logo"
                        onError={(e) => {
                          // if image not present, show fallback spinner by hiding image
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                        style={{ width: 20, height: 20, objectFit: "contain", animation: "spin 0.9s linear infinite" }}
                      />
                      <style>{`
                        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
                        /* fallback spinner if image is missing */
                        .fallback-dot {
                          width: 14px; height: 14px; border-radius: 50%;
                          border: 2px solid rgba(0,0,0,0.15);
                          border-top-color: #111;
                          animation: spin 0.9s linear infinite;
                        }
                      `}</style>
                      <div className="fallback-dot" />
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
